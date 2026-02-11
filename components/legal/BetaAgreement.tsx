import React from 'react';

const BetaAgreement: React.FC = () => {
  return (
    <div className="text-slate-600 space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-sm leading-relaxed">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
          Sales Sidekik - Private Beta Participation Agreement
        </h2>
        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
          Version 1.0 • Last Updated: October 2023
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px]">1</span>
          NATURE OF BETA SERVICE
        </h3>
        <p>
          You acknowledge that the Service is in a preliminary "Private Beta" stage. The Service is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without warranties. We do not guarantee that the Service will be error-free or that your data will be preserved. You accept the risk that data may be lost, corrupted, or wiped.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px]">2</span>
          LIMITATION OF LIABILITY
        </h3>
        <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-medium uppercase text-slate-500">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW: IN NO EVENT SHALL THE COMPANY BE LIABLE FOR INDIRECT, SPECIAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED $100.00 USD.
        </p>
        <p>
          We are specifically <strong>NOT LIABLE</strong> for errors in AI-generated advice or loss of user data.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px]">3</span>
          USER DATA & RESPONSIBILITIES
        </h3>
        <p>
          You retain ownership of your data. You agree <strong>NOT</strong> to upload highly sensitive PII (Social Security Numbers, Health Info, etc.). You are solely responsible for ensuring you have the legal right to upload any client data. You agree to indemnify the Company against claims arising from your use of third-party data.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px]">4</span>
          FEEDBACK OWNERSHIP
        </h3>
        <p>
          Any feedback, bugs, or feature requests you provide become the sole property of the Company. You waive any right to compensation for ideas we implement.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px]">5</span>
          CONFIDENTIALITY
        </h3>
        <p>
          You agree not to share screenshots or specific details of the internal workings of the Service with the public or competitors without written permission.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px]">6</span>
          GOVERNING LAW
        </h3>
        <p>
          This Agreement shall be governed by the laws of the State of North Carolina. Disputes will be resolved exclusively in Wake County, North Carolina.
        </p>
      </section>

      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">
          By proceeding, you agree to be bound by these Private Beta terms.
        </p>
      </div>
    </div>
  );
};

export default BetaAgreement;