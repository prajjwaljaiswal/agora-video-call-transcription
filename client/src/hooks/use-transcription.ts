import { useState, useEffect, useRef, useCallback } from "react";

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useTranscription(
  audioTrack: any | null, // Not used but kept for API compatibility
  speakerName: string = "You",
  enabled: boolean = true
) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const segmentIdCounter = useRef(0);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get SpeechRecognition API
  const getSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") {
      console.warn("⚠️ Window is undefined");
      return null;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("❌ Speech Recognition API not available in this browser");
      console.log("Browser info:", {
        hasSpeechRecognition: !!window.SpeechRecognition,
        hasWebkitSpeechRecognition: !!window.webkitSpeechRecognition,
        userAgent: navigator.userAgent,
      });
      return null;
    }

    console.log("✅ Speech Recognition API found");
    return new SpeechRecognition();
  }, []);

  // Check microphone permissions - but don't request a new stream if Agora already has it
  const checkMicrophonePermission = useCallback(async () => {
    try {
      // Check if we can query permissions
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        console.log("🎤 Microphone permission status:", permissionStatus.state);

        if (permissionStatus.state === "denied") {
          setError(
            "Microphone permission denied. Please allow microphone access in your browser settings."
          );
          return false;
        }

        // If granted or prompt, we can proceed (Agora likely already has access)
        return true;
      }

      // Fallback: Try to get media (but don't keep it - Agora has it)
      // This is just to check if permission exists
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (err: any) {
        // If Agora already has the mic, this might fail, but that's okay
        // The Web Speech API should still work if permissions are granted
        console.log(
          "⚠️ Could not get separate mic stream (Agora may be using it):",
          err.name
        );
        // Don't fail - Web Speech API might still work
        return true;
      }
    } catch (err: any) {
      console.error("Microphone permission check error:", err);
      // Don't block - Web Speech API might still work
      return true;
    }
  }, []);

  // Start transcription
  const startTranscription = useCallback(async () => {
    if (!enabled) {
      console.log("Transcription not enabled");
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError(
        "Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      console.warn("Speech recognition not available");
      return;
    }

    // Check if already listening
    if (recognitionRef.current) {
      console.log("Already transcribing");
      return;
    }

    // Check microphone permissions first (but don't block if check fails)
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      console.warn("⚠️ Permission check failed, but trying anyway...");
      // Don't return - Web Speech API might still work
    }

    try {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log("🎤 Speech recognition result received", {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length,
        });

        // Process all results, not just the latest one
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || "";

          if (!transcript.trim()) continue;

          if (result.isFinal) {
            // Final result - add as complete segment
            console.log("✅ Final transcript:", transcript);
            const newSegment: TranscriptSegment = {
              id: `segment-${segmentIdCounter.current++}`,
              speaker: speakerName,
              text: transcript.trim(),
              timestamp: Date.now(),
              isFinal: true,
            };

            setSegments((prev) => {
              // Remove any interim segments from the same speaker and add final one
              const filtered = prev.filter(
                (s) => !(s.speaker === speakerName && !s.isFinal)
              );
              return [...filtered, newSegment];
            });
          } else {
            // Interim result - update or add interim segment
            console.log("📝 Interim transcript:", transcript);
            setSegments((prev) => {
              // Remove previous interim segment from this speaker
              const filtered = prev.filter(
                (s) => !(s.speaker === speakerName && !s.isFinal)
              );

              // Add new interim segment
              const interimSegment: TranscriptSegment = {
                id: `interim-${speakerName}`,
                speaker: speakerName,
                text: transcript.trim(),
                timestamp: Date.now(),
                isFinal: false,
              };

              return [...filtered, interimSegment];
            });
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("❌ Speech recognition error:", {
          error: event.error,
          message: event.message,
        });

        if (event.error === "no-speech") {
          // This is common, don't show as error - just means no speech detected yet
          console.log("💭 No speech detected yet (this is normal)...");
          return;
        }
        if (event.error === "aborted") {
          // User stopped, don't show as error
          console.log("⏸️ Transcription aborted");
          return;
        }
        if (event.error === "not-allowed") {
          const errorMsg =
            "Microphone permission denied. Please allow microphone access in your browser settings.";
          console.error(errorMsg);
          setError(errorMsg);
          setIsListening(false);
          return;
        }
        if (event.error === "network") {
          const errorMsg =
            "Network error. Please check your internet connection.";
          console.error(errorMsg);
          setError(errorMsg);
          return;
        }
        if (event.error === "service-not-allowed") {
          const errorMsg =
            "Speech recognition service not available. Please try again later.";
          console.error(errorMsg);
          setError(errorMsg);
          return;
        }
        // Log other errors but don't necessarily stop
        console.warn(
          `⚠️ Transcription warning: ${event.error} - ${event.message}`
        );
      };

      recognition.onstart = () => {
        console.log("✅ Speech recognition started successfully");
        console.log("🎤 Ready to transcribe. Start speaking...");
        setIsListening(true);
        setError(null);
      };

      recognition.onaudiostart = () => {
        console.log("🔊 Audio capture started");
      };

      recognition.onaudioend = () => {
        console.log("🔇 Audio capture ended");
      };

      recognition.onsoundstart = () => {
        console.log("🔊 Sound detected");
      };

      recognition.onsoundend = () => {
        console.log("🔇 Sound ended");
      };

      recognition.onspeechstart = () => {
        console.log("🗣️ Speech detected!");
      };

      recognition.onspeechend = () => {
        console.log("🗣️ Speech ended");
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
        recognitionRef.current = null;

        // Auto-restart if still enabled
        if (enabled) {
          // Clear any existing timeout
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }

          restartTimeoutRef.current = setTimeout(() => {
            if (enabled && !recognitionRef.current) {
              console.log("🔄 Auto-restarting transcription...");
              startTranscription();
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      console.log("🎤 Starting speech recognition...");
    } catch (err: any) {
      console.error("Error starting transcription:", err);
      setError(err.message || "Failed to start transcription");
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [enabled, speakerName, getSpeechRecognition, checkMicrophonePermission]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (err) {
        console.error("Error stopping transcription:", err);
      }
      recognitionRef.current = null;
      setIsListening(false);
      console.log("🛑 Stopped transcription");
    }
  }, []);

  // Clear all segments
  const clearSegments = useCallback(() => {
    setSegments([]);
    segmentIdCounter.current = 0;
  }, []);

  // Start/stop based on enabled state
  useEffect(() => {
    console.log("🔄 Transcription effect triggered:", {
      enabled,
      hasRecognition: !!getSpeechRecognition(),
    });

    if (enabled) {
      // Small delay to ensure everything is ready
      const timeoutId = setTimeout(() => {
        console.log("⏰ Starting transcription after delay...");
        startTranscription();
      }, 1000); // Increased delay to ensure Agora is set up

      return () => {
        clearTimeout(timeoutId);
        stopTranscription();
      };
    } else {
      console.log("⏸️ Transcription disabled, stopping...");
      stopTranscription();
    }
  }, [enabled, startTranscription, stopTranscription, getSpeechRecognition]);

  // Get full transcript text
  const getFullTranscript = useCallback(() => {
    return segments
      .filter((s) => s.isFinal)
      .map((s) => `${s.speaker}: ${s.text}`)
      .join("\n\n");
  }, [segments]);

  return {
    segments,
    isListening,
    error,
    startTranscription,
    stopTranscription,
    clearSegments,
    getFullTranscript,
  };
}
