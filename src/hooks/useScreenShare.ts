import { useEffect, useState, useRef, useCallback } from "react";
import { useRoom } from "@/store/RoomContext";

export function useScreenShare() {
  const { state, wsRef } = useRoom();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const peersRef = useRef<{ [peerId: string]: RTCPeerConnection }>({});

  // 1. Listen for WebSocket signals
  useEffect(() => {
    if (!wsRef.current) return;
    
    const ws = wsRef.current;
    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === "peer_joined") {
          if (localStream) {
            const pc = createPeer(msg.peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "signal", target: msg.peerId, from: state.myId, signal: { type: "offer", sdp: pc.localDescription } }));
          }
        }
        else if (msg.type === "signal" && msg.target === state.myId) {
          const peerId = msg.from;
          const { signal } = msg;

          let pc = peersRef.current[peerId];
          if (!pc) {
            pc = createPeer(peerId);
          }

          if (signal.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "signal", target: peerId, from: state.myId, signal: { type: "answer", sdp: pc.localDescription } }));
          } else if (signal.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
        else if (msg.type === "share_started") {
          // A peer started sharing. They will send an offer.
        }
        else if (msg.type === "share_stopped") {
          if (peersRef.current[msg.from]) {
            peersRef.current[msg.from].close();
            delete peersRef.current[msg.from];
          }
          if (Object.keys(peersRef.current).length === 0) setRemoteStream(null);
        }
        else if (msg.type === "peer_left") {
          if (peersRef.current[msg.peerId]) {
            peersRef.current[msg.peerId].close();
            delete peersRef.current[msg.peerId];
          }
          if (Object.keys(peersRef.current).length === 0) setRemoteStream(null);
        }
      } catch (err) {
        console.error("WebRTC Error:", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [state.myId, wsRef, localStream]);

  const createPeer = (peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "signal", target: peerId, from: state.myId, signal: { candidate: event.candidate } }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peersRef.current[peerId] = pc;
    return pc;
  };

  const startShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsSharing(true);

      stream.getVideoTracks()[0].onended = () => stopShare();

      // Broadcast to room that we are sharing so they can prepare
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "share_started", from: state.myId }));
      }
      
      // We must create an offer to all existing peers (not implemented here perfectly since we don't track all peers yet,
      // but if they send a ping or we know they are there, we could. For now, let's just wait for them to request or reload).
      // A more robust implementation would fetch the peer list and loop through them.
    } catch (err) {
      console.error(err);
    }
  }, [state.myId, wsRef]);

  const stopShare = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsSharing(false);
    
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "share_stopped", from: state.myId }));
    }
  }, [localStream, state.myId, wsRef]);

  return { isSharing, startShare, stopShare, localStream, remoteStream };
}
