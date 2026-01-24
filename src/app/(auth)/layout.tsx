'use client';

import React from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding with Gradient Mesh */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, var(--charcoal-900) 0%, var(--charcoal-950) 50%, var(--charcoal-900) 100%)'
        }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20 animate-float"
            style={{ background: 'radial-gradient(circle, var(--lemon-500) 0%, transparent 60%)' }}
          />
          <div
            className="absolute top-1/2 -left-48 w-[400px] h-[400px] rounded-full opacity-10 animate-float"
            style={{ background: 'radial-gradient(circle, var(--lemon-400) 0%, transparent 60%)', animationDelay: '2s' }}
          />
          <div
            className="absolute -bottom-48 right-1/4 w-[300px] h-[300px] rounded-full opacity-15 animate-float"
            style={{ background: 'radial-gradient(circle, var(--info) 0%, transparent 70%)', animationDelay: '4s' }}
          />
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--lemon-500) 1px, transparent 1px),
                              linear-gradient(90deg, var(--lemon-500) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Logo */}
        <div className="relative z-10 pt-10 px-10 animate-slide-down">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/lemondots-logo.png"
                alt="LemonDots Logo"
                width={44}
                height={44}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute -inset-2 bg-[var(--lemon-500)]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight font-[family-name:var(--font-display)]">
                LemonDots
              </span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--lemon-500)] flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                AI Forecasting
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 px-10 flex-1 flex flex-col justify-center">
          <div className="max-w-lg animate-slide-right">
            {/* Headline */}
            <h2 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight font-[family-name:var(--font-display)]">
              Predict Tomorrow.
              <br />
              <span className="text-gradient">Profit Today.</span>
            </h2>

            {/* Subheadline */}
            <p className="text-lg text-[var(--charcoal-400)] leading-relaxed">
              AI-powered demand forecasting for India&apos;s leading food & beverage brands.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-6">
              <div className="opacity-0 animate-slide-up stagger-1">
                <p className="text-3xl font-bold text-white font-mono tabular-nums">92%</p>
                <p className="text-sm text-[var(--charcoal-400)] mt-1">Accuracy Rate</p>
              </div>
              
              <div className="opacity-0 animate-slide-up stagger-3">
                <p className="text-3xl font-bold text-white font-mono tabular-nums">2M+</p>
                <p className="text-sm text-[var(--charcoal-400)] mt-1">Forecasts Daily</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-8 px-10">
          <p className="text-sm text-[var(--charcoal-500)]">
            © {new Date().getFullYear()} LemonDots AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-gradient-mesh px-6 py-12">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <Image
              src="/lemondots-logo.png"
              alt="LemonDots Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground font-[family-name:var(--font-display)]">
                LemonDots
              </span>
              <span className="text-[9px] font-semibold tracking-widest uppercase text-[var(--lemon-600)] flex items-center gap-1">
                <Sparkles className="h-2 w-2" />
                AI Forecasting
              </span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
