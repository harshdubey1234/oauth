"use client";

import { useState } from "react";
import { Compass, Pause, Play, Layers3 } from "lucide-react";
import { ProviderIcon } from "./provider-icon";

/** A decorative, CSS-built scene. No canvas, external models or render loop. */
export function ConnectionScene() {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`connection-scene${paused ? " is-paused" : ""}`}>
      <div className="scene-label">
        <Layers3 size={13} /> THE CONNECTION MAP
      </div>
      <div className="scene-art" aria-hidden="true">
        <div className="scene-board">
          <div className="scene-floor" />
          <div className="scene-orbit orbit-outer" />
          <div className="scene-orbit orbit-inner" />
          <svg className="scene-routes" viewBox="0 0 560 420" fill="none">
            <g className="route-base">
              <path d="M130 106H207Q238 106 238 144V170Q238 204 280 204" />
              <path d="M438 112H360Q326 112 326 148V170Q326 204 280 204" />
              <path d="M121 302H206Q238 302 238 267V245Q238 218 280 218" />
              <path d="M440 299H355Q326 299 326 265V245Q326 218 280 218" />
            </g>
            <g className="route-signal">
              <path d="M130 106H207Q238 106 238 144V170Q238 204 280 204" />
              <path d="M438 112H360Q326 112 326 148V170Q326 204 280 204" />
              <path d="M121 302H206Q238 302 238 267V245Q238 218 280 218" />
              <path d="M440 299H355Q326 299 326 265V245Q326 218 280 218" />
            </g>
            <g fill="#b8adf3">
              <circle cx="204" cy="106" r="3" />
              <circle cx="359" cy="112" r="3" />
              <circle cx="206" cy="302" r="3" />
              <circle cx="355" cy="299" r="3" />
            </g>
          </svg>
          <div className="core-shadow" />
          <div className="scene-core">
            <div className="core-cube">
              <div className="cube-face cube-front">
                <Compass size={43} strokeWidth={1.25} />
              </div>
              <div className="cube-face cube-right">
                <span />
              </div>
              <div className="cube-face cube-top">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
          <div className="core-wordmark">
            ATLAS<span>YOUR NEXT STEP</span>
          </div>
          <div className="scene-provider scene-github">
            <ProviderIcon name="GitHub" />
            <span>
              GitHub<small>Repository access</small>
            </span>
          </div>
          <div className="scene-provider scene-gmail">
            <ProviderIcon name="Gmail" />
            <span>
              Gmail<small>Scope & verification</small>
            </span>
          </div>
          <div className="scene-provider scene-tally">
            <ProviderIcon name="Tally" />
            <span>
              Tally<small>Independent pick</small>
            </span>
          </div>
          <div className="scene-provider scene-slack">
            <ProviderIcon name="Slack" />
            <span>
              Slack<small>Workspace approval</small>
            </span>
          </div>
          <span className="scene-coordinate coordinate-top">01 / DISCOVER</span>
          <span className="scene-coordinate coordinate-bottom">
            02 / UNDERSTAND → 03 / BUILD
          </span>
        </div>
      </div>
      <button
        className="scene-toggle"
        type="button"
        aria-pressed={paused}
        aria-label={
          paused ? "Resume decorative animation" : "Pause decorative animation"
        }
        onClick={() => setPaused(!paused)}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
        <span>Motion {paused ? "off" : "on"}</span>
      </button>
    </div>
  );
}
