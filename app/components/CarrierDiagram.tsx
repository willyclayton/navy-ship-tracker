/** Stylized side-profile diagram of a Nimitz-class carrier with labeled parts. */
export default function CarrierDiagram() {
  return (
    <div className="diagram">
      <svg viewBox="0 0 860 300" role="img" aria-label="Side-profile diagram of a Nimitz-class aircraft carrier">
        {/* water */}
        <rect x="0" y="212" width="860" height="88" fill="#dbeafe" />
        <line x1="0" y1="212" x2="860" y2="212" stroke="#93c5fd" strokeWidth="2" />

        {/* hull below deck */}
        <path
          d="M 60 130 L 800 130 L 812 150 L 790 212 L 745 236 L 150 236 L 95 212 L 60 170 Z"
          fill="#64748b"
          stroke="#334155"
          strokeWidth="2"
        />
        {/* bow bulb */}
        <path d="M 95 212 L 60 170 L 48 196 L 66 224 Z" fill="#475569" />
        {/* hangar bay opening */}
        <rect x="330" y="150" width="120" height="52" rx="4" fill="#334155" />
        <rect x="500" y="150" width="90" height="52" rx="4" fill="#334155" />
        {/* flight deck */}
        <path d="M 40 118 L 820 118 L 800 130 L 60 130 Z" fill="#475569" stroke="#334155" strokeWidth="2" />
        <line x1="70" y1="123" x2="790" y2="123" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="10 8" />

        {/* island */}
        <rect x="565" y="62" width="86" height="56" fill="#64748b" stroke="#334155" strokeWidth="2" />
        <rect x="577" y="42" width="52" height="22" fill="#64748b" stroke="#334155" strokeWidth="2" />
        <rect x="583" y="70" width="14" height="10" fill="#cbd5e1" />
        <rect x="603" y="70" width="14" height="10" fill="#cbd5e1" />
        <rect x="623" y="70" width="14" height="10" fill="#cbd5e1" />
        {/* mast + radar */}
        <line x1="600" y1="42" x2="600" y2="12" stroke="#334155" strokeWidth="3" />
        <line x1="586" y1="20" x2="614" y2="20" stroke="#334155" strokeWidth="3" />

        {/* aircraft on deck */}
        <path d="M 200 108 l 26 0 l -8 10 l -14 0 Z" fill="#1e3a5f" />
        <path d="M 300 108 l 26 0 l -8 10 l -14 0 Z" fill="#1e3a5f" />
        <path d="M 700 108 l 26 0 l -8 10 l -14 0 Z" fill="#1e3a5f" />

        {/* propellers */}
        <circle cx="180" cy="230" r="10" fill="none" stroke="#334155" strokeWidth="2.5" />
        <circle cx="215" cy="234" r="10" fill="none" stroke="#334155" strokeWidth="2.5" />

        {/* callouts */}
        <g className="callout">
          <line x1="608" y1="40" x2="680" y2="24" />
          <text x="686" y="28">Island — bridge &amp; flight control</text>
        </g>
        <g className="callout">
          <line x1="120" y1="118" x2="96" y2="72" />
          <text x="30" y="64">Flight deck — 4.5 acres,</text>
          <text x="30" y="80">4 steam catapults</text>
        </g>
        <g className="callout">
          <line x1="390" y1="176" x2="390" y2="268" />
          <text x="398" y="272">Hangar bay — aircraft parking &amp; repair</text>
        </g>
        <g className="callout">
          <line x1="700" y1="180" x2="740" y2="268" />
          <text x="640" y="284">2 nuclear reactors — 25 yrs between refuelings</text>
        </g>
        <g className="callout">
          <line x1="198" y1="244" x2="176" y2="276" />
          <text x="60" y="290">4 propellers, 30+ knots</text>
        </g>

        {/* length dimension */}
        <line x1="60" y1="96" x2="812" y2="96" stroke="#0b4f9e" strokeWidth="1.5" markerStart="url(#arrowL)" markerEnd="url(#arrowR)" />
        <line x1="60" y1="88" x2="60" y2="104" stroke="#0b4f9e" strokeWidth="1.5" />
        <line x1="812" y1="88" x2="812" y2="104" stroke="#0b4f9e" strokeWidth="1.5" />
        <rect x="390" y="84" width="94" height="22" fill="#f8fafc" />
        <text x="437" y="100" textAnchor="middle" className="dim">1,092 ft</text>
      </svg>
    </div>
  );
}
