interface OwlProps {
  state?: 'idle' | 'loading' | 'sad' | 'confused' | 'sleeping';
  size?: number;
  className?: string;
}

export default function Owl({ state = 'idle', size = 120, className = '' }: OwlProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body - Rounded owl body */}
      <ellipse
        cx="60"
        cy="70"
        rx="32"
        ry="35"
        fill="#52575F"
      />

      {/* Belly pattern - Lighter feathers */}
      <ellipse
        cx="60"
        cy="75"
        rx="20"
        ry="25"
        fill="#6B7078"
      />

      {/* Feather details on belly */}
      <path d="M 50 65 Q 52 68, 50 71" stroke="#52575F" strokeWidth="1" fill="none" />
      <path d="M 55 68 Q 57 71, 55 74" stroke="#52575F" strokeWidth="1" fill="none" />
      <path d="M 60 70 Q 62 73, 60 76" stroke="#52575F" strokeWidth="1" fill="none" />
      <path d="M 65 68 Q 67 71, 65 74" stroke="#52575F" strokeWidth="1" fill="none" />
      <path d="M 70 65 Q 72 68, 70 71" stroke="#52575F" strokeWidth="1" fill="none" />

      {/* Head - Large round head */}
      <circle
        cx="60"
        cy="45"
        r="28"
        fill="#52575F"
      />

      {/* Ear tufts - Characteristic owl ears */}
      <path
        d="M 40 25 L 35 15 L 42 22 Z"
        fill="#3A3D45"
      />
      <path
        d="M 80 25 L 85 15 L 78 22 Z"
        fill="#3A3D45"
      />

      {/* Eye patches - Lighter colored face discs */}
      <circle
        cx="50"
        cy="45"
        r="12"
        fill="#6B7078"
      />
      <circle
        cx="70"
        cy="45"
        r="12"
        fill="#6B7078"
      />

      {/* Eyes - Large expressive eyes */}
      {state === 'sleeping' ? (
        <>
          {/* Closed eyes */}
          <path
            d="M 44 45 Q 50 48, 56 45"
            stroke="#1A1D23"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 64 45 Q 70 48, 76 45"
            stroke="#1A1D23"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Large eyes - outer */}
          <circle cx="50" cy="45" r="8" fill="#1A1D23" />
          <circle cx="70" cy="45" r="8" fill="#1A1D23" />

          {/* Iris with amber glow */}
          <circle
            cx="50"
            cy="45"
            r="5"
            fill="#FBBF24"
            className={state === 'loading' ? 'animate-glow' : ''}
          />
          <circle
            cx="70"
            cy="45"
            r="5"
            fill="#FBBF24"
            className={state === 'loading' ? 'animate-glow' : ''}
          />

          {/* Pupils */}
          <circle
            cx="50"
            cy="45"
            r="3"
            fill="#0F1419"
            className={state === 'loading' ? 'animate-blink' : ''}
          />
          <circle
            cx="70"
            cy="45"
            r="3"
            fill="#0F1419"
            className={state === 'loading' ? 'animate-blink' : ''}
          />

          {/* Eye shine */}
          <circle cx="51" cy="43" r="1.5" fill="white" opacity="0.9" />
          <circle cx="71" cy="43" r="1.5" fill="white" opacity="0.9" />

          {/* Glowing aura around eyes (when loading) */}
          {state === 'loading' && (
            <>
              <circle
                cx="50"
                cy="45"
                r="10"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="0.5"
                opacity="0.3"
                className="animate-pulse-glow"
              />
              <circle
                cx="70"
                cy="45"
                r="10"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="0.5"
                opacity="0.3"
                className="animate-pulse-glow"
              />
            </>
          )}
        </>
      )}

      {/* Beak */}
      <path
        d="M 60 54 L 55 60 L 60 62 L 65 60 Z"
        fill="#FCD34D"
      />

      {/* Sad eyebrows */}
      {state === 'sad' && (
        <>
          <path
            d="M 44 38 Q 48 36, 52 38"
            stroke="#3A3D45"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 68 38 Q 72 36, 76 38"
            stroke="#3A3D45"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Confused expression */}
      {state === 'confused' && (
        <>
          <path
            d="M 44 38 L 52 40"
            stroke="#3A3D45"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 76 38 L 68 40"
            stroke="#3A3D45"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Wings */}
      <ellipse
        cx="32"
        cy="75"
        rx="10"
        ry="18"
        fill="#3A3D45"
        className={state === 'loading' ? 'animate-wing-left' : ''}
      />
      <ellipse
        cx="88"
        cy="75"
        rx="10"
        ry="18"
        fill="#3A3D45"
        className={state === 'loading' ? 'animate-wing-right' : ''}
      />

      {/* Feet/Talons */}
      <g>
        {/* Left foot */}
        <ellipse cx="50" cy="100" rx="5" ry="6" fill="#FCD34D" />
        <line x1="47" y1="103" x2="45" y2="108" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="103" x2="50" y2="108" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        <line x1="53" y1="103" x2="55" y2="108" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />

        {/* Right foot */}
        <ellipse cx="70" cy="100" rx="5" ry="6" fill="#FCD34D" />
        <line x1="67" y1="103" x2="65" y2="108" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        <line x1="70" y1="103" x2="70" y2="108" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        <line x1="73" y1="103" x2="75" y2="108" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Book (when idle or reading) */}
      {(state === 'idle' || state === 'loading') && (
        <g transform="translate(45, 82)">
          {/* Book cover */}
          <rect x="0" y="0" width="30" height="22" rx="2" fill="#92400E" />
          {/* Book pages */}
          <rect x="2" y="2" width="26" height="18" fill="#FEF3C7" />
          {/* Page lines */}
          <line x1="5" y1="6" x2="25" y2="6" stroke="#D97706" strokeWidth="0.5" />
          <line x1="5" y1="9" x2="25" y2="9" stroke="#D97706" strokeWidth="0.5" />
          <line x1="5" y1="12" x2="25" y2="12" stroke="#D97706" strokeWidth="0.5" />
          <line x1="5" y1="15" x2="20" y2="15" stroke="#D97706" strokeWidth="0.5" />
          {/* Book spine */}
          <rect x="14" y="0" width="2" height="22" fill="#78350F" />
        </g>
      )}

      {/* Confused question mark */}
      {state === 'confused' && (
        <g opacity="0.8">
          <text
            x="88"
            y="35"
            fontSize="20"
            fill="#FBBF24"
            className="animate-float"
          >
            ?
          </text>
        </g>
      )}

      {/* Sleeping Z's */}
      {state === 'sleeping' && (
        <g className="animate-sleep-z">
          <text x="85" y="30" fontSize="16" fill="#FBBF24" opacity="0.6">Z</text>
          <text x="92" y="23" fontSize="14" fill="#FBBF24" opacity="0.4">z</text>
          <text x="97" y="18" fontSize="12" fill="#FBBF24" opacity="0.2">z</text>
        </g>
      )}

      {/* Moon (when idle) */}
      {state === 'idle' && (
        <g opacity="0.4">
          <circle cx="95" cy="20" r="8" fill="#FCD34D" className="animate-moon-glow" />
          <circle cx="98" cy="18" r="6" fill="#0F1419" />
        </g>
      )}

      <style>
        {`
          @keyframes glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          @keyframes blink {
            0%, 90%, 100% { opacity: 1; }
            95% { opacity: 0; }
          }

          @keyframes wing-left {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            50% { transform: translateX(-3px) rotate(-10deg); }
          }

          @keyframes wing-right {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            50% { transform: translateX(3px) rotate(10deg); }
          }

          @keyframes pulse-glow {
            0%, 100% { r: 10; opacity: 0.3; }
            50% { r: 12; opacity: 0.6; }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }

          @keyframes sleep-z {
            0% { opacity: 0; transform: translateY(0); }
            50% { opacity: 1; }
            100% { opacity: 0; transform: translateY(-20px); }
          }

          @keyframes moon-glow {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }

          .animate-glow {
            animation: glow 2s ease-in-out infinite;
          }

          .animate-blink {
            animation: blink 4s ease-in-out infinite;
          }

          .animate-wing-left {
            animation: wing-left 2s ease-in-out infinite;
            transform-origin: 32px 75px;
          }

          .animate-wing-right {
            animation: wing-right 2s ease-in-out infinite;
            transform-origin: 88px 75px;
          }

          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }

          .animate-float {
            animation: float 2s ease-in-out infinite;
          }

          .animate-sleep-z {
            animation: sleep-z 2s ease-in-out infinite;
          }

          .animate-moon-glow {
            animation: moon-glow 3s ease-in-out infinite;
          }
        `}
      </style>
    </svg>
  );
}
