import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { io } from "socket.io-client";
import { auth, provider } from "./firebase"; 
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import gsap from "gsap"; // ✨ GSAP IMPORT
import './App.css'; 

// ✅ YOUR LIVE BACKEND
const BACKEND_URL = "https://meetscure-final.onrender.com"; 

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: false,
  autoConnect: false,
});

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPreloader, setShowPreloader] = useState(true);

  // 🌀 GSAP Preloader Logic
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setShowPreloader(false) });
      tl.to(".circle-text", { rotation: 360, duration: 2, ease: "power2.inOut", repeat: 1 })
        .to(".brand-center", { scale: 1.2, duration: 0.5, yoyo: true, repeat: 3 }, "<")
        .to(".preloader-container", { y: "-100%", duration: 1, ease: "expo.inOut" });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (showPreloader) return (
    <div className="preloader-container">
      <div className="circle-wrap">
        <div className="circle-text"></div>
        <div className="brand-center">Meetscure</div>
      </div>
    </div>
  );

  if (!user) return <LandingPage />;
  return <VideoCall user={user} />;
}

// 🏠 LANDING PAGE (UI Overhaul)
function LandingPage() {
  const [review, setReview] = useState("");

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { alert(e.message); }
  };

  const sendReview = () => {
    if(!review) return;
    // 📨 Sending Review to Admin via Socket Logs
    socket.connect();
    socket.emit("send-message", `⭐⭐ NEW REVIEW: ${review}`); 
    alert("Thanks for your feedback!");
    setReview("");
  };

  // Animate elements on mount
  useEffect(() => {
    gsap.from(".hero-title", { y: 50, opacity: 0, duration: 1, delay: 0.5 });
    gsap.from(".hero-subtitle", { y: 30, opacity: 0, duration: 1, delay: 0.8 });
    gsap.from(".hero-image-grid", { y: 100, opacity: 0, duration: 1.2, delay: 1 });
  }, []);

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero-section">
        <h1 className="hero-title">Meet. Connect.<br/> <span style={{color:'#6366f1'}}>Securely.</span></h1>
        <p className="hero-subtitle">The next generation of random video chat. High quality, safe, and instant.</p>
        <button onClick={handleLogin} className="google-btn-large">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="24" alt="G" />
          Start Video Chat
        </button>
        
        <div className="hero-image-grid">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop" className="hero-img" alt="Chat 1" />
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=300&auto=format&fit=crop" className="hero-img" alt="Chat 2" />
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop" className="hero-img" alt="Chat 3" />
        </div>
      </section>

      {/* Vision & What We Do */}
      <section className="info-section">
        <h2 className="section-title">Our Vision</h2>
        <p className="text-content">
          To create a digital space where strangers become friends without the fear of privacy breaches. 
          We believe in spontaneous connection, human interaction, and safety above all else.
        </p>
        <br/><br/>
        <h2 className="section-title">What We Do</h2>
        <p className="text-content">
          Meetscure connects you randomly with people across the globe using P2P encryption. 
          Our algorithm ensures low latency video calls while keeping your personal data completely anonymous.
        </p>
      </section>

      {/* Safety & Legal */}
      <section className="info-section">
        <div className="safety-box">
          <div className="warning-title">⚠️ 18+ AGE RESTRICTION</div>
          <p>
            You must be 18 years or older to use Meetscure. We have a zero-tolerance policy for nudity, 
            harassment, or illegal activities. Violators will be banned immediately.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="info-section">
        <h2 className="section-title">FAQ</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <div className="faq-q">Is it free?</div>
            <div>Yes, 100% free to use forever.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">Do you record video?</div>
            <div>No. Connections are Peer-to-Peer. Video goes directly between users.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">Why is my screen black?</div>
            <div>Try using mobile data. Some WiFi networks block video connections.</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>
            <h3>Meetscure</h3>
            <div className="social-links">
              <a href="#" style={{color:'white'}}>Instagram</a>
              <a href="#" style={{color:'white'}}>Gmail: support@meetscure.com</a>
            </div>
            <p style={{marginTop:'20px', fontSize:'0.8rem', color:'#666'}}>&copy; 2025 Meetscure Inc.</p>
          </div>
          <div>
            <h3>Send Feedback</h3>
            <div className="review-form">
              <textarea placeholder="Write a review or report a bug..." value={review} onChange={e => setReview(e.target.value)} />
              <button className="send-btn" onClick={sendReview}>Submit Review</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 🎥 VIDEO APP (Fixed Layout & Buttons)
function VideoCall({ user }) {
  const myVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const peerRef = useRef(null);
  const partnerIdRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("Idle");
  const [searching, setSearching] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    socket.connect(); 
    startCamera(); 

    socket.on("waiting", () => { 
        setStatus("Searching..."); setSearching(true); setRemoteStream(null); 
    });
    
    socket.on("stranger-found", ({ id, initiator }) => {
      if (peerRef.current) cleanupPeer();
      partnerIdRef.current = id;
      setSearching(false);
      setStatus("Connected");
      setTimeout(() => { if (initiator) initiateCall(id); }, 500);
    });

    socket.on("signal", async (data) => {
      const { from, signal } = data || {};
      if (!signal) return;
      if (signal.offer) await handleOffer(from, signal.offer);
      else if (signal.answer) await handleAnswer(signal.answer);
      else if (signal.candidate) await handleCandidate(signal.candidate);
    });

    socket.on("partner-left", () => { setStatus("Stranger left"); cleanupPeer(); });

    return () => { socket.disconnect(); cleanupPeer(); };
  }, []);

  // Auto-play stranger video
  useEffect(() => { 
    if (strangerVideoRef.current && remoteStream) {
        strangerVideoRef.current.srcObject = remoteStream;
        strangerVideoRef.current.play().catch(e => console.log("Play error", e));
    }
  }, [remoteStream]);

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s; 
      if (myVideoRef.current) { myVideoRef.current.srcObject = s; myVideoRef.current.muted = true; }
    } catch (err) { alert("Camera access denied"); }
  }

  function createPeerConnection(targetId) {
    if (!streamRef.current) return null;
    if (peerRef.current) peerRef.current.close();
    
    // 🔥 WIFI/DATA FIX: ROBUST ICE SERVERS
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // These openrelay servers help bypass WiFi firewalls
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
  
  async function handleAnswer(answer) { if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer)); }
  async function handleCandidate(candidate) { if (peerRef.current && peerRef.current.remoteDescription) await peerRef.current.addIceCandidate(candidate); }
  
  function cleanupPeer() {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    partnerIdRef.current = null;
    setRemoteStream(null);
  }

  function startFinding() { if (!streamRef.current) return; setStatus("Searching..."); setSearching(true); socket.emit("find-stranger"); }
  function next() { socket.emit("skip"); cleanupPeer(); setStatus("Skipped"); setSearching(true); }
  function stop() { socket.emit("skip"); cleanupPeer(); setSearching(false); setStatus("Stopped"); }
  const handleLogout = async () => { await signOut(auth); };

  return (
    <div className="video-container">
      {/* 50/50 Video Area */}
      <div className="video-flex-area">
        <div className="video-box">
          {remoteStream ? (
             <video ref={strangerVideoRef} autoPlay playsInline className="video-element" />
          ) : (
            <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#666'}}>
               {searching ? "Looking for someone..." : "Click Start"}
            </div>
          )}
          <div className="tag">Stranger</div>
        </div>
        <div className="video-box">
          <video ref={myVideoRef} autoPlay playsInline muted className="video-element my-feed" />
          <div className="tag">You</div>
        </div>
      </div>

      {/* Simple Control Bar */}
      <div className="control-bar">
        {!searching && !partnerIdRef.current ? (
          <button onClick={startFinding} className="control-btn btn-start">Start</button>
        ) : (
          <>
            <button onClick={stop} className="control-btn btn-stop">Stop</button>
            <button onClick={next} className="control-btn btn-next">Next</button>
          </>
        )}
        <button onClick={handleLogout} style={{background:'transparent', border:'1px solid #333', color:'white', padding:'10px', borderRadius:'50%'}}>↪</button>
      </div>
    </div>
  );
}