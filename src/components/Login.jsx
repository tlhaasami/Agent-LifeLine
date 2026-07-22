"use client";

import React, { useState, useRef } from "react";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoPoster, setVideoPoster] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const videoRef = useRef(null);

  const handleVideoLoaded = (e) => {
    const video = e.target;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setVideoPoster(dataUrl);
    } catch (err) {
      // Ignore cross-origin canvas errors if any
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store auth session
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", data.role);

      if (onSuccess) {
        onSuccess(data.role);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Google Font Outfit Loader */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
      `}} />

      {/* Left Column: Login Form */}
      <div className="login-form-col">
        <div className="login-form-inner">
          {/* Logo / Header */}
          <div className="login-logo-header">
            <img src="/logo.png" alt="LifeLine Logo" className="login-logo-img" />
            <h1 className="login-title">
              LifeLine
            </h1>
          </div>

          <h2 className="login-subtitle">
            Welcome Back
          </h2>
          <p className="login-desc">
            Enter your credentials to access the tracking dashboard.
          </p>

          <form onSubmit={handleSubmit} className="login-form-element">
            {error && (
              <div style={{
                padding: "0.85rem 1.1rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px",
                color: "#f87171",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                boxShadow: "0 2px 4px rgba(220, 38, 38, 0.05)"
              }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.55rem", color: "#374151" }}>
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                style={{
                  width: "100%",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "10px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  color: "#111827",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.55rem", color: "#374151" }}>
                Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "0.85rem 3rem 0.85rem 1.1rem",
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    color: "#111827",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "1rem",
                    background: "transparent",
                    border: "none",
                    color: "#4b5563",
                    cursor: "pointer",
                    fontSize: "1.15rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    outline: "none",
                    zIndex: 10
                  }}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="animated-btn"
              style={{
                width: "100%",
                padding: "0.9rem",
                borderRadius: "10px",
                backgroundColor: "#d15c2e",
                color: "white",
                fontWeight: 700,
                fontSize: "0.95rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.6rem",
                marginTop: "0.6rem",
                outline: "none",
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Verifying Session...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          <footer className="login-footer">
            LifeLine Systems &copy; {new Date().getFullYear()}. Secure administrator access.
          </footer>
        </div>
      </div>

      {/* Right Column: Logo Animation Video */}
      <div className="login-video-col">
        <video
          ref={videoRef}
          src="/logo-animation.mp4#t=1.5"
          poster={videoPoster || undefined}
          onLoadedData={handleVideoLoaded}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="login-bg-video"
          onEnded={(e) => {
            e.target.currentTime = 1.2;
            e.target.play().catch(() => { });
          }}
        />
      </div>

      {/* Responsive Styles */}
      <style jsx global>{`
        .login-root {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background-color: #ffffff;
          color: #111827;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        .login-form-col {
          flex: 0 0 45%;
          width: 45%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3.5rem 2.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          border-right: 1px solid rgba(0, 0, 0, 0.08);
          z-index: 10;
          box-shadow: 10px 0 30px rgba(0, 0, 0, 0.05);
        }

        .login-form-inner {
          width: 100%;
          max-width: 380px;
        }

        .login-logo-header {
          display: flex;
          align-items: center;
          gap: 1.2rem;
          margin-bottom: 2rem;
        }

        .login-logo-img {
          height: 60px;
          width: auto;
          flex-shrink: 0;
        }

        .login-title {
          margin: 0;
          font-size: 2.4rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: #111827;
          font-family: 'Outfit', sans-serif;
        }

        .login-subtitle {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: #111827;
          letter-spacing: -0.02em;
          font-family: 'Outfit', sans-serif;
        }

        .login-desc {
          color: #4b5563;
          font-size: 0.92rem;
          margin-bottom: 2rem;
          line-height: 1.5;
          font-weight: 500;
        }

        .login-form-element {
          display: flex;
          flex-direction: column;
          gap: 1.3rem;
        }

        .login-footer {
          margin-top: 2.5rem;
          font-size: 0.78rem;
          color: #6b7280;
          font-weight: 500;
        }

        .login-video-col {
          flex: 0 0 55%;
          width: 55%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          overflow: hidden;
        }

        .login-bg-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        input:focus {
          border-color: #d15c2e !important;
          box-shadow: 0 0 0 3px rgba(209, 92, 46, 0.15) !important;
          background-color: #ffffff !important;
        }
        
        .animated-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #e26939 0%, #d15c2e 100%) !important;
          box-shadow: 0 4px 14px rgba(209, 92, 46, 0.35);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .animated-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          transition: 0.75s ease-in-out;
          opacity: 0;
        }

        .animated-btn:hover {
          transform: translateY(-2px) scale(1.015);
          box-shadow: 0 8px 20px rgba(209, 92, 46, 0.55) !important;
          background: linear-gradient(135deg, #d15c2e 0%, #b84b20 100%) !important;
        }

        .animated-btn:hover::after {
          left: 125%;
          opacity: 1;
          transition: all 0.6s ease-in-out;
        }

        .animated-btn:active {
          transform: translateY(0) scale(0.985);
          box-shadow: 0 4px 10px rgba(209, 92, 46, 0.3) !important;
        }

        /* Mobile Layout (< 900px): Centered Glass Card with NO vertical scrolling */
        @media (max-width: 900px) {
          .login-root {
            position: relative !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 1rem !important;
            height: 100vh !important;
            height: 100dvh !important;
            overflow: hidden !important;
            background-color: #ffffff !important;
          }

          .login-video-col {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 0 !important;
            background-color: #ffffff !important;
          }

          .login-form-col {
            flex: none !important;
            width: 100% !important;
            max-width: 380px !important;
            padding: 2rem 1.5rem !important;
            background: rgba(255, 255, 255, 0.72) !important;
            backdrop-filter: blur(14px) !important;
            -webkit-backdrop-filter: blur(14px) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important;
            border-radius: 20px !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1) !important;
            margin: auto !important;
            z-index: 10 !important;
            max-height: 92vh !important;
            max-height: 92dvh !important;
            overflow: hidden !important;
          }

          .login-logo-header {
            margin-bottom: 1.25rem !important;
          }

          .login-logo-img {
            height: 48px !important;
          }

          .login-title {
            font-size: 2rem !important;
          }

          .login-subtitle {
            font-size: 1.7rem !important;
            margin-bottom: 0.25rem !important;
          }

          .login-desc {
            font-size: 0.85rem !important;
            margin-bottom: 1.25rem !important;
          }

          .login-form-element {
            gap: 0.9rem !important;
          }

          .login-footer {
            margin-top: 1.5rem !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}
