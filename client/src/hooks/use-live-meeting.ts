import { useState, useEffect, useCallback } from 'react';

export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'expert' | 'guest';
  isMuted: boolean;
  isVideoOff: boolean;
  joinedAt: number;
}

const STORAGE_KEY_PREFIX = 'gateway_meeting_participants_';

export function useLiveMeeting(meetingId: string | undefined) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(null);

  const getStorageKey = useCallback(() => {
    if (!meetingId) return null;
    return `${STORAGE_KEY_PREFIX}${meetingId}`;
  }, [meetingId]);

  // Load initial participants
  useEffect(() => {
    const key = getStorageKey();
    if (!key) return;

    const load = () => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setParticipants(JSON.parse(stored));
        } else {
          setParticipants([]);
        }
      } catch (e) {
        console.error("Failed to load participants", e);
      }
    };

    load();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        load();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [getStorageKey]);

  const syncToStorage = (newParticipants: Participant[]) => {
    const key = getStorageKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(newParticipants));
    // Dispatch a custom event so other hooks in the same tab/window update if needed (though mostly for cross-tab)
    window.dispatchEvent(new Event('storage')); 
  };

  const joinMeeting = (name: string, role: Participant['role']) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newParticipant: Participant = {
      id,
      name,
      role,
      isMuted: false,
      isVideoOff: false,
      joinedAt: Date.now()
    };

    setLocalParticipantId(id);
    
    setParticipants(prev => {
      // Filter out any stale entry with same ID if it exists (unlikely)
      const updated = [...prev, newParticipant];
      syncToStorage(updated);
      return updated;
    });

    return id;
  };

  const leaveMeeting = () => {
    if (!localParticipantId) return;
    
    setParticipants(prev => {
      const updated = prev.filter(p => p.id !== localParticipantId);
      syncToStorage(updated);
      return updated;
    });
    setLocalParticipantId(null);
  };

  const toggleMic = (mute: boolean) => {
    if (!localParticipantId) return;
    setParticipants(prev => {
      const updated = prev.map(p => p.id === localParticipantId ? { ...p, isMuted: mute } : p);
      syncToStorage(updated);
      return updated;
    });
  };

  const toggleVideo = (videoOff: boolean) => {
    if (!localParticipantId) return;
    setParticipants(prev => {
      const updated = prev.map(p => p.id === localParticipantId ? { ...p, isVideoOff: videoOff } : p);
      syncToStorage(updated);
      return updated;
    });
  };

  // Cleanup on unmount (optional, maybe we want them to stay "in" if they refresh? 
  // For now, let's keep them in unless they explicitly leave, or we can use session storage logic.
  // But for a robust mockup, explicit leave is better.)

  return {
    participants,
    localParticipantId,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleVideo
  };
}
