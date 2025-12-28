'use client';

import React from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Minimal Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)'
        }}
      >
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
          />
          <div 
            className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10 pt-12 px-12">
          <div className="flex items-center gap-3">
            <Image 
              src="/lemondots-logo.png" 
              alt="LemonDots Logo" 
              width={44} 
              height={44}
              className="object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                LemonDots <span className="text-[#fbbf24]">AI</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Main content - Minimal */}
        <div className="relative z-10 px-12 flex-1 flex flex-col justify-center">
          <div className="max-w-lg">
            {/* Headline */}
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              Predict Tomorrow.
              <br />
              <span className="text-[#fbbf24]">Profit Today.</span>
            </h2>
            
            {/* Subheadline */}
            <p className="text-lg text-slate-400 leading-relaxed">
              AI-powered demand forecasting for India&apos;s leading food & beverage brands.
            </p>
          </div>
        </div>

        {/* Footer - Minimal */}
        <div className="relative z-10 pb-8 px-12">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} LemonDots AI
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-[#f8fafc] px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <Image 
              src="/lemondots-logo.png" 
              alt="LemonDots Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
            <h1 className="text-xl font-bold text-[#1e293b]">
              LemonDots <span className="text-[#fbbf24]">AI</span>
            </h1>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}
