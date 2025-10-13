import React from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-12 text-white relative"
        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
      >
        <div className="absolute top-12 left-16 flex items-center gap-3">
          <Image 
            src="/lemondots-logo.png" 
            alt="Lemondots Logo" 
            width={48} 
            height={48}
            className="object-contain"
          />
          <h1 className="text-5xl font-bold">Lemondots.</h1>
        </div>
        <div className="max-w-2xl">
          <p className="text-4xl font-semibold mb-8 text-slate-300">
            Uptime up. Dead stock down.
          </p>
          <p className="text-2xl text-slate-400">
            Know When, What, How much and with Whom to Order
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
} 