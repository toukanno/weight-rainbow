import AVFoundation
import Capacitor
import Foundation
import Speech

@objc(SpeechRecognition)
public class SpeechRecognition: CAPPlugin {
    private let defaultMatches = 5
    private var recognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?

    @objc func available(_ call: CAPPluginCall) {
        let available = SFSpeechRecognizer()?.isAvailable ?? false
        call.resolve(["available": available])
    }

    @objc func start(_ call: CAPPluginCall) {
        if audioEngine?.isRunning == true {
            call.reject("Speech recognition is already running.")
            return
        }

        let permission = buildPermissionStatus()
        let speechPermission = permission["speechRecognition"] as? String
        let microphonePermission = permission["microphone"] as? String

        guard speechPermission == "granted", microphonePermission == "granted" else {
            call.reject("Missing permission")
            return
        }

        let locale = Locale(identifier: call.getString("language") ?? "en-US")
        recognizer = SFSpeechRecognizer(locale: locale)
        let maxResults = call.getInt("maxResults") ?? defaultMatches
        let partialResults = call.getBool("partialResults") ?? false

        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = partialResults
        audioEngine = AVAudioEngine()

        guard let audioEngine, let recognitionRequest, let recognizer, recognizer.isAvailable else {
            call.reject("Speech recognition is not available.")
            return
        }

        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, options: [.defaultToSpeaker, .duckOthers])
            try audioSession.setMode(.measurement)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            call.reject(error.localizedDescription)
            return
        }

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        var didRespond = false

        recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self else { return }

            if let result {
                let matches = Array(result.transcriptions.prefix(maxResults)).map(\.formattedString)
                if partialResults {
                    self.notifyListeners("partialResults", data: ["matches": matches])
                } else if !didRespond {
                    didRespond = true
                    call.resolve(["matches": matches])
                }

                if result.isFinal {
                    self.stopRecognition()
                }
            }

            if let error {
                self.stopRecognition()
                if !didRespond {
                    didRespond = true
                    call.reject(error.localizedDescription)
                }
            }
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            notifyListeners("listeningState", data: ["status": "started"])
            if partialResults {
                didRespond = true
                call.resolve()
            }
        } catch {
            stopRecognition()
            call.reject(error.localizedDescription)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        stopRecognition()
        call.resolve()
    }

    @objc func isListening(_ call: CAPPluginCall) {
        call.resolve(["listening": audioEngine?.isRunning == true])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(buildPermissionStatus())
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { _ in
            AVAudioSession.sharedInstance().requestRecordPermission { _ in
                DispatchQueue.main.async {
                    call.resolve(self.buildPermissionStatus())
                }
            }
        }
    }

    private func stopRecognition() {
        if audioEngine?.isRunning == true {
            audioEngine?.stop()
        }
        audioEngine?.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        notifyListeners("listeningState", data: ["status": "stopped"])
    }

    private func buildPermissionStatus() -> PluginCallResultData {
        let speechStatus = SFSpeechRecognizer.authorizationStatus()
        let speechPermission: String
        switch speechStatus {
        case .authorized:
            speechPermission = "granted"
        case .denied, .restricted:
            speechPermission = "denied"
        case .notDetermined:
            speechPermission = "prompt"
        @unknown default:
            speechPermission = "prompt"
        }

        let microphonePermission: String
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            microphonePermission = "granted"
        case .denied:
            microphonePermission = "denied"
        case .undetermined:
            microphonePermission = "prompt"
        @unknown default:
            microphonePermission = "prompt"
        }

        return [
            "speechRecognition": speechPermission,
            "microphone": microphonePermission
        ]
    }
}
