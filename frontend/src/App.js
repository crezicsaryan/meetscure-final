import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { auth, provider } from "./firebase"; 
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css'; 

// ✅ LIVE RENDER BACKEND
const BACKEND_URL = "https://meetscure-final.onrender.com"; 

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: false,
  autoConnect: false,
});

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading...</div>;

  if (!user) return <LoginScreen />;
  return <VideoCall user={user} />;
}

// 🔐 LOGIN SCREEN (Unchanged)
function LoginScreen() {
  const [showModal, setShowModal] = useState(false);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (error) { alert("Login Failed: " + error.message); } };

  return (
    <div className="login-container">
      <div className="bg-image"></div>
      <div className="video-overlay"></div>
      <button className="dev-info-btn" onClick={() => setShowModal(true)}>Developer Info ℹ️</button>
      <div className="content-grid">
        <div className="card login-card">
          <h1 className="brand-title">Meetscure</h1>
          <p className="tagline">Secure. Random. Instant.</p>
          <button onClick={handleGoogleLogin} className="google-btn">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="24" alt="G" />
            Continue with Google
          </button>
        </div>
        <div className="card features-card">
          <div className="section-label">WHY MEETSCURE?</div>
          <div className="feature-images">
            <div className="feature-img-box"><img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2064&auto=format&fit=crop" className="feature-img" alt="Friends" /><span className="img-caption">Real Connections</span></div>
            <div className="feature-img-box"><img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop" className="feature-img" alt="Global" /><span className="img-caption">Global Reach</span></div>
          </div>
        </div>
      </div>
      <footer className="footer">&copy; 2025 Meetscure. All rights reserved.</footer>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="modal-role">LEAD DEVELOPER & FOUNDER</div>
            <div className="modal-name">Aryan Singh</div>
            <p className="modal-desc">2nd Year Engineering Student.<br/>Passionate about building secure, scalable, and real-time connection platforms for the world.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎥 VIDEO APP (Clean Version)
function VideoCall({ user }) {
  const myVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const peerRef = useRef(null);
  const partnerIdRef = useRef(null);
  const initiatorRef = useRef(false);
  const streamRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [status, setStatus] = useState("Press Start");
  const [searching, setSearching] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    socket.connect(); 
    startCamera(); 

    socket.on("waiting", () => { 
        setStatus("Searching..."); setSearching(true); setMessages([]); 
        setRemoteStream(null);
    });
    
    socket.on("stranger-found", ({ id, initiator }) => {
      if (peerRef.current) cleanupPeer();
      partnerIdRef.current = id;
      initiatorRef.current = !!initiator;
      setSearching(false);
      setStatus("Connected! ⚡");
      setMessages([]);
      setTimeout(() => { if (initiatorRef.current) initiateCall(id); }, 500);
    });

    socket.on("signal", async (data) => {
      const { from, signal } = data || {};
      if (!signal) return;
      if (signal.offer) await handleOffer(from, signal.offer);
      else if (signal.answer) await handleAnswer(signal.answer);
      else if (signal.candidate) await handleCandidate(signal.candidate);
    });

    socket.on("receive-message", (data) => {
        setMessages(prev => [...prev, data]);
        setIsChatOpen(true); 
    });
    
    socket.on("partner-left", () => { setStatus("Stranger disconnected."); cleanupPeer(); });

    return () => { socket.removeAllListeners(); cleanupPeer(); socket.disconnect(); };
  }, []);

  // 🔥 FORCE AUTO-PLAY WITHOUT BUTTON
  useEffect(() => { 
    if (strangerVideoRef.current && remoteStream) {
        strangerVideoRef.current.srcObject = remoteStream;
        // Keep trying to play until it works
        const tryPlay = () => {
            strangerVideoRef.current.play().catch(e => {
                console.log("Autoplay blocked, retrying...", e);
                setTimeout(tryPlay, 1000); // Retry every second
            });
        };
        tryPlay();
    }
  }, [remoteStream]);

  async function startCamera() {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s; 
      if (myVideoRef.current) { myVideoRef.current.srcObject = s; myVideoRef.current.muted = true; }
    } catch (err) { console.error(err); setStatus("Camera Error"); }
  }

  function createPeerConnection(targetId) {
    if (!streamRef.current) return null;
    if (peerRef.current) peerRef.current.close();
    
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
      ] 
    });
    
    pc.ontrack = (e) => { setRemoteStream(e.streams[0]); };
    pc.onicecandidate = (ev) => { if (ev.candidate) socket.emit("signal", { to: targetId, signal: { candidate: ev.candidate } }); };
    streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));
    
    peerRef.current = pc;
    return pc;
  }

  async function initiateCall(targetId) {
    const pc = createPeerConnection(targetId);
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { to: targetId, signal: { offer } });
  }
  
  async function handleOffer(fromId, offer) {
    partnerIdRef.current = fromId;
    const pc = createPeerConnection(fromId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { to: fromId, signal: { answer } });
  }
  
  async function handleAnswer(answer) {
    if (!peerRef.current) return;
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  }
  
  async function handleCandidate(candidate) {
    if (!peerRef.current) return;
    if (!peerRef.current.remoteDescription) return; 
    await peerRef.current.addIceCandidate(candidate);
  }
  
  function cleanupPeer() {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    partnerIdRef.current = null;
    setRemoteStream(null);
  }

  function startFinding() { if (!streamRef.current) return; setStatus("Searching..."); setSearching(true); socket.emit("find-stranger"); }
  function skip() { socket.emit("skip"); cleanupPeer(); setMessages([]); setStatus("Skipped"); setSearching(true); setIsChatOpen(false); }
  function end() { socket.emit("skip"); cleanupPeer(); setMessages([]); setSearching(false); setStatus("Stopped"); setIsChatOpen(false); }
  function sendMsg(e) { e.preventDefault(); if (!inputMsg.trim() || !partnerIdRef.current) return; socket.emit("send-message", inputMsg); setMessages(prev => [...prev, { sender: "me", text: inputMsg }]); setInputMsg(""); }
  const handleLogout = async () => { await signOut(auth); };

  return (
    <div className="app-layout">
      <div className="header">
        <div className="brand-name">Meetscure</div>
        <button onClick={handleLogout} style={{background:'none', border:'none', fontSize:'1.2rem'}}>↪</button>
      </div>

      <div className="main-scroll">
        <div className="video-card">
            <div className="video-wrapper">
                {/* Clean Video Element: No buttons, just video */}
                <video ref={strangerVideoRef} autoPlay playsInline className="video-stream" />
                <div className="label">Stranger</div>
            </div>
            <div className="video-wrapper">
                <video ref={myVideoRef} autoPlay playsInline muted className="video-stream my-feed" />
                <div className="label">You</div>
            </div>
        </div>

        <div className="controls-section">
            <div className="btn-row">
                {!searching && !partnerIdRef.current ? (
                    <button onClick={startFinding} className="action-btn btn-blue">Start</button>
                ) : (
                    <button onClick={end} className="action-btn btn-danger">Stop</button>
                )}
                <button onClick={skip} className="action-btn btn-gray">Next</button>
            </div>
            <div className="btn-row">
                {/* 🚩 RED FLAG REMOVED */}
                <button onClick={() => setIsChatOpen(true)} className="icon-btn" style={{background: isChatOpen ? '#0ea5e9' : '#f3f4f6', color: isChatOpen ? 'white' : '#333'}}>💬</button>
            </div>
        </div>
        {status && <div className="status-pill">{status}</div>}
      </div>

      <div className={`chat-sheet ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-header"><span>Chat Room</span><button className="close-btn" onClick={() => setIsChatOpen(false)}>✕</button></div>
        <div className="chat-messages">
            {messages.map((m, i) => (<div key={i} className={`msg ${m.sender === "me" ? "me" : "them"}`}>{m.text}</div>))}
            <div ref={chatBottomRef}></div>
        </div>
        <form onSubmit={sendMsg} className="chat-input-bar">
            <input className="chat-input" placeholder="Message..." value={inputMsg} onChange={e => setInputMsg(e.target.value)} disabled={!partnerIdRef.current}/>
            <button type="submit" className="chat-send" disabled={!partnerIdRef.current}>➤</button>
        </form>
      </div>
    </div>
  );
}