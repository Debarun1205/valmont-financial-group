import React from 'react';

export default function LandingPage({ onStart }) {
  return (
    <div className="bg-surface text-on-primary antialiased selection:bg-brand-rose-tint selection:text-brand-crimson">
      <main className="w-full bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          {/* Top Atmospheric Subtle Grid & Hero */}
          <section className="relative w-full overflow-hidden bg-surface pb-space-3xl pt-24">
            <div className="absolute inset-0 pointer-events-none opacity-20 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-brand-rose-tint rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative max-w-5xl mx-auto px-6 lg:px-8 pt-12 flex flex-col items-center text-center">
              
              {/* Announcement Pill Badge */}
              <a className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container border border-border-hairline text-slate-headline shadow-sm hover:shadow transition-all group" href="#">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-crimson text-on-primary text-[10px] font-bold">✓</span>
                <span className="font-label-badge text-label-badge text-slate-headline">Valmont v15</span>
                <span className="font-caption text-caption text-slate-body font-medium">Timescale & Solana Integrated</span>
              </a>

              {/* Main Impact Headline */}
              <h1 className="mt-8 font-display-hero text-display-hero text-slate-headline tracking-tight max-w-4xl">
                One identity.<br/>
                <span className="text-brand-crimson">Many financial lenses.</span>
              </h1>
              
              {/* Subtitle */}
              <p className="mt-5 font-body-lg text-body-lg text-slate-body max-w-2xl">
                Portable trust, a multi-asset wallet, lending, investing, protection and business intelligence — designed around one explainable risk engine.
              </p>
              
              {/* Primary Action */}
              <div className="mt-8 flex flex-col items-center gap-2.5">
                <button onClick={onStart} className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-brand-crimson text-on-primary font-label-button text-[16px] shadow-lg shadow-brand-crimson/25 hover:brightness-110 hover:shadow-xl transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer">
                  Connect identity
                </button>
                <span className="font-caption text-caption text-slate-body mt-2">
                  No credit check required. On-chain attestation built-in.
                </span>
              </div>

              {/* Interactive Showcase */}
              <div className="mt-20 w-full relative">
                <div className="w-full rounded-2xl bg-surface-container border border-border-hairline shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
                  <div className="h-11 px-4 bg-surface-container-low border-b border-border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-body/30"></span>
                      <span className="w-3 h-3 rounded-full bg-slate-body/30"></span>
                      <span className="w-3 h-3 rounded-full bg-slate-body/30"></span>
                    </div>
                  </div>
                  <div className="p-8 text-left grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface-subtle">
                    <div className="col-span-1 border-r border-border-hairline pr-6">
                       <h3 className="text-slate-headline font-bold text-xl mb-4">Risk Engine</h3>
                       <div className="text-5xl font-bold text-brand-crimson mb-2">78<span className="text-lg text-slate-body">/100</span></div>
                       <p className="text-slate-body text-sm">Score is the common signal across all lenses.</p>
                       <div className="mt-6 flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-surface rounded text-xs text-slate-headline border border-border-hairline">Income verified</span>
                          <span className="px-2 py-1 bg-surface rounded text-xs text-slate-headline border border-border-hairline">Timescale signals</span>
                          <span className="px-2 py-1 bg-surface rounded text-xs text-slate-headline border border-border-hairline">Solana attestation</span>
                       </div>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-surface rounded-xl border border-border-hairline">
                           <div className="text-xs text-slate-body uppercase tracking-widest mb-1">identity</div>
                           <div className="font-bold text-slate-headline">One portable score</div>
                        </div>
                        <div className="p-4 bg-surface rounded-xl border border-border-hairline">
                           <div className="text-xs text-slate-body uppercase tracking-widest mb-1">wallet</div>
                           <div className="font-bold text-slate-headline">Fiat & SOL liquidity</div>
                        </div>
                        <div className="p-4 bg-surface rounded-xl border border-border-hairline">
                           <div className="text-xs text-slate-body uppercase tracking-widest mb-1">loans</div>
                           <div className="font-bold text-slate-headline">Borrow or fund</div>
                        </div>
                        <div className="p-4 bg-surface rounded-xl border border-border-hairline">
                           <div className="text-xs text-slate-body uppercase tracking-widest mb-1">invest</div>
                           <div className="font-bold text-slate-headline">AI allocation models</div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Social Proof */}
          <section className="w-full py-12 bg-surface-container-low border-y border-border-hairline">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
              <p className="font-label-eyebrow text-label-eyebrow text-slate-body uppercase tracking-wider mb-8">
                Powered by enterprise infrastructure
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 transition-all duration-300">
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-slate-headline">TimescaleDB</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-slate-headline">Solana</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-slate-headline">Neon</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-slate-headline">Vercel</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-slate-headline">Plaid</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-slate-headline">Stripe</span>
              </div>
            </div>
          </section>

          {/* Problem Section */}
          <section className="w-full py-space-3xl bg-surface">
            <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-rose-tint text-brand-crimson font-label-eyebrow text-label-eyebrow uppercase tracking-widest mb-3">
                Problem
              </div>
              <h2 className="font-headline-xl text-headline-xl text-slate-headline tracking-tight max-w-2xl mx-auto">
                Traditional finance forces you to rebuild trust everywhere.
              </h2>
              
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <div className="p-8 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[24px]">layers_clear</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-3">Fragmented Identity</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Your banking, investing, and lending lives are completely isolated. Every new product requires starting your reputation from zero.
                  </p>
                </div>
                <div className="p-8 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[24px]">hourglass_empty</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-3">Black-box Scores</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Legacy credit bureaus calculate risk behind closed doors using outdated metrics, shutting out modern workers and builders.
                  </p>
                </div>
                <div className="p-8 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[24px]">security</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-3">Locked Liquidity</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Capital is trapped. Lenders cannot easily fund peers, and individuals cannot leverage their verified transaction history.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Solution Section */}
          <section className="w-full py-space-3xl bg-surface-container-low border-t border-border-hairline">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-rose-tint text-brand-crimson font-label-eyebrow text-label-eyebrow uppercase tracking-widest mb-3">
                  Solution
                </div>
                <h2 className="font-headline-xl text-headline-xl text-slate-headline tracking-tight">
                  Universal Finance OS
                </h2>
                <p className="mt-4 font-body-md text-body-md text-slate-body">
                  One verified identity. One explainable risk engine. Infinite applications.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 p-8 rounded-2xl bg-surface-container border border-border-hairline flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-brand-crimson mb-4">
                      <span className="material-symbols-outlined text-[20px]">psychology</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-slate-headline mb-2">Real-time Risk Engine</h3>
                    <p className="font-body-md text-body-md text-slate-body max-w-lg mb-6">
                      We continuously analyze spending behavior, verified income, and asset history to generate a live, explainable trust score.
                    </p>
                  </div>
                  <div className="w-full p-4 rounded-xl bg-surface shadow-inner border border-border-hairline">
                    <div className="flex items-center justify-between text-xs text-slate-body mb-3 font-caption">
                      <span>ENGINE METRICS</span>
                      <span className="text-brand-crimson font-medium">CONTINUOUS UPDATES</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-surface-container-low rounded-lg">
                        <span className="font-caption text-caption text-slate-body block">Signals</span>
                        <span className="font-headline-sm text-headline-sm text-slate-headline">12+</span>
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-lg">
                        <span className="font-caption text-caption text-slate-body block">Attestation</span>
                        <span className="font-headline-sm text-headline-sm text-slate-headline">On-chain</span>
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-lg">
                        <span className="font-caption text-caption text-slate-body block">Explainability</span>
                        <span className="font-headline-sm text-headline-sm text-slate-headline">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-4 p-8 rounded-2xl bg-surface-container border border-border-hairline flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-brand-crimson mb-4">
                      <span className="material-symbols-outlined text-[20px]">enhanced_encryption</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-slate-headline mb-2">Solana Attestation</h3>
                    <p className="font-body-md text-body-md text-slate-body mb-6">
                      Your score is cryptographically attested on the Solana devnet, making your reputation universally portable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Strip */}
          <section className="w-full py-space-3xl bg-surface border-t border-border-hairline">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-rose-tint text-brand-crimson font-label-eyebrow text-label-eyebrow uppercase tracking-widest mb-3">
                Features
              </div>
              <h2 className="font-headline-xl text-headline-xl text-slate-headline tracking-tight mb-16">
                Lenses on the same engine
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <div className="p-6 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-2">Multi-asset Wallet</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Manage fiat and digital gold from a single primary ledger.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[24px]">handshake</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-2">P2P Lending</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Borrow instantly or fund peers based on verified trust scores.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[24px]">store</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-2">Merchant Health</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Unlock credit lines scaled directly to your rolling 30d revenue.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-surface-container border border-border-hairline">
                  <div className="w-12 h-12 rounded-xl bg-brand-rose-tint text-brand-crimson flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-headline mb-2">AI Advisory</h3>
                  <p className="font-body-md text-body-md text-slate-body">
                    Conversational intelligence connected directly to your financial state.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Pre-Footer Banner CTA */}
          <section className="w-full py-space-3xl border-t border-border-hairline relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-crimson/5"></div>
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
              <h2 className="font-headline-xl text-headline-xl text-slate-headline tracking-tight mb-8">
                Your workspace is waiting.
              </h2>
              <button onClick={onStart} className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-brand-crimson text-on-primary font-label-button text-label-button shadow-lg shadow-brand-crimson/25 hover:brightness-110 hover:shadow-xl transition-all scale-100 hover:scale-[1.02]">
                Create your identity
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
