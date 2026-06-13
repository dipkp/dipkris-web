import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

export function useWebRTC(socket: Socket | null, localStream: MediaStream | null, roomId: string) {
  const [remoteStreams, setRemoteStreams] = useState<PeerStream[]>([]);
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());

  useEffect(() => {
    if (!socket) return;

    const createPeer = (targetId: string, initiator: boolean) => {
      const options: Peer.Options = {
        initiator,
        trickle: true,
        config: { iceServers: ICE_SERVERS }
      };
      
      if (localStream) {
        options.stream = localStream;
      }

      const peer = new Peer(options);

      peer.on('signal', (signalData) => {
        if (signalData.type === 'offer') {
          socket.emit('webrtc-offer', { targetId, callerId: socket.id, sdp: signalData });
        } else if (signalData.type === 'answer') {
          socket.emit('webrtc-answer', { targetId, callerId: socket.id, sdp: signalData });
        } else if ((signalData as any).candidate) {
          socket.emit('webrtc-ice-candidate', { targetId, callerId: socket.id, candidate: signalData });
        } else {
           if (initiator) {
             socket.emit('webrtc-offer', { targetId, callerId: socket.id, sdp: signalData });
           } else {
             socket.emit('webrtc-answer', { targetId, callerId: socket.id, sdp: signalData });
           }
        }
      });

      peer.on('stream', (stream) => {
        setRemoteStreams(prev => {
          if (prev.find(p => p.peerId === targetId)) return prev;
          return [...prev, { peerId: targetId, stream }];
        });
      });

      peer.on('close', () => {
        setRemoteStreams(prev => prev.filter(p => p.peerId !== targetId));
        peersRef.current.delete(targetId);
      });

      peersRef.current.set(targetId, peer);
      return peer;
    };

    const onRoomState = (state: any) => {
      state.users.forEach((userId: string) => {
        if (userId !== socket.id && !peersRef.current.has(userId)) {
          createPeer(userId, true);
        }
      });
    };

    const onUserJoined = (userId: string) => {
      console.log('User joined, waiting for offer:', userId);
    };

    const onUserLeft = (userId: string) => {
      const peer = peersRef.current.get(userId);
      if (peer) {
        peer.destroy();
        peersRef.current.delete(userId);
        setRemoteStreams(prev => prev.filter(p => p.peerId !== userId));
      }
    };

    const onOffer = ({ callerId, sdp }: any) => {
      let peer = peersRef.current.get(callerId);
      if (!peer) {
        peer = createPeer(callerId, false);
      }
      peer.signal(sdp);
    };

    const onAnswer = ({ callerId, sdp }: any) => {
      const peer = peersRef.current.get(callerId);
      if (peer) {
        peer.signal(sdp);
      }
    };

    const onIceCandidate = ({ callerId, candidate }: any) => {
      const peer = peersRef.current.get(callerId);
      if (peer) {
        peer.signal(candidate);
      }
    };

    socket.on('room-state', onRoomState);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice-candidate', onIceCandidate);

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice-candidate', onIceCandidate);
    };

  }, [socket, localStream]);

  return { remoteStreams };
}
