import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useRoomStore } from '@/store/useRoomStore';

export function useWebRTC(socket: Socket | null, localStream: MediaStream | null) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const { users } = useRoomStore();

  const createPeer = useCallback((targetSocketId: string, initiator: boolean) => {
    if (peersRef.current.has(targetSocketId)) {
      return peersRef.current.get(targetSocketId)!;
    }

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peersRef.current.set(targetSocketId, peer);

    // Add current local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });
    }

    // Force negotiation for initiator
    if (initiator) {
      peer.createDataChannel('chat'); // triggers onnegotiationneeded
    }

    peer.onnegotiationneeded = async () => {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket?.emit('webrtc_offer', { targetSocketId, offer: peer.localDescription });
      } catch (err) {
        console.error("Negotiation error:", err);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', { targetSocketId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        // Only keep the first stream for simplicity
        next.set(targetSocketId, event.streams[0]);
        return next;
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed' || peer.connectionState === 'disconnected') {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(targetSocketId);
          return next;
        });
        peersRef.current.delete(targetSocketId);
      }
    };

    return peer;
  }, [socket, localStream]);

  // Handle incoming signaling
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({ senderSocketId, offer }: any) => {
      const peer = createPeer(senderSocketId, false);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('webrtc_answer', { targetSocketId: senderSocketId, answer: peer.localDescription });
    };

    const handleAnswer = async ({ senderSocketId, answer }: any) => {
      const peer = peersRef.current.get(senderSocketId);
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate }: any) => {
      const peer = peersRef.current.get(senderSocketId);
      if (peer) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, createPeer]);

  // When a new user joins, initiate a connection to them
  useEffect(() => {
    if (!socket) return;
    const handleUserJoined = ({ socketId }: { userId: string, socketId: string }) => {
      // Small delay to ensure both sides are ready
      setTimeout(() => {
        createPeer(socketId, true);
      }, 1000);
    };
    socket.on('user_joined', handleUserJoined);
    return () => {
      socket.off('user_joined', handleUserJoined);
    };
  }, [socket, createPeer]);

  // Handle stream changes (e.g. host starts sharing screen)
  useEffect(() => {
    if (localStream) {
      peersRef.current.forEach(peer => {
        const senders = peer.getSenders();
        localStream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            peer.addTrack(track, localStream);
          }
        });
      });
    }
  }, [localStream]);

  return { remoteStreams };
}
