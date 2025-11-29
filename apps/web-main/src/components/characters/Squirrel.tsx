interface SquirrelProps {
  state?: 'idle' | 'loading' | 'sad' | 'confused' | 'sleeping';
  size?: number;
  className?: string;
}

export default function Squirrel({ state = 'idle', size = 120, className = '' }: SquirrelProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tail - Big fluffy tail */}
      <path
        d="M 25 70 Q 10 50, 15 30 Q 18 20, 25 18 Q 32 16, 38 20 Q 42 25, 40 35 Q 38 45, 35 55 Q 32 65, 28 72"
        fill="#B45309"
        className={state === 'loading' ? 'animate-tail-wag' : ''}
      >
        {state === 'loading' && (
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 30 40"
            to="15 30 40"
            dur="0.5s"
            repeatCount="indefinite"
            additive="sum"
          />
        )}
      </path>

      {/* Body - Main round body */}
      <ellipse
        cx="60"
        cy="65"
        rx="28"
        ry="32"
        fill="#D97706"
      />

      {/* Belly - Lighter colored belly */}
      <ellipse
        cx="60"
        cy="72"
        rx="18"
        ry="20"
        fill="#FEF3C7"
      />

      {/* Head - Round head */}
      <circle
        cx="60"
        cy="40"
        r="22"
        fill="#D97706"
      />

      {/* Ears - Pointy ears */}
      <ellipse
        cx="48"
        cy="25"
        rx="6"
        ry="12"
        fill="#D97706"
        transform="rotate(-20 48 25)"
      />
      <ellipse
        cx="72"
        cy="25"
        rx="6"
        ry="12"
        fill="#D97706"
        transform="rotate(20 72 25)"
      />

      {/* Ear inner */}
      <ellipse
        cx="48"
        cy="27"
        rx="3"
        ry="6"
        fill="#FCD34D"
        transform="rotate(-20 48 27)"
      />
      <ellipse
        cx="72"
        cy="27"
        rx="3"
        ry="6"
        fill="#FCD34D"
        transform="rotate(20 72 27)"
      />

      {/* Eyes */}
      {state === 'sleeping' ? (
        <>
          {/* Closed eyes */}
          <path
            d="M 50 38 Q 52 40, 54 38"
            stroke="#78350F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 66 38 Q 68 40, 70 38"
            stroke="#78350F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Open eyes - outer */}
          <circle cx="52" cy="38" r="5" fill="#78350F" />
          <circle cx="68" cy="38" r="5" fill="#78350F" />

          {/* Pupils */}
          <circle
            cx="52"
            cy="38"
            r="2.5"
            fill="white"
            className={state === 'loading' ? 'animate-blink' : ''}
          />
          <circle
            cx="68"
            cy="38"
            r="2.5"
            fill="white"
            className={state === 'loading' ? 'animate-blink' : ''}
          />

          {/* Sparkle in eyes */}
          <circle cx="53" cy="37" r="1" fill="white" opacity="0.8" />
          <circle cx="69" cy="37" r="1" fill="white" opacity="0.8" />
        </>
      )}

      {/* Nose */}
      <circle cx="60" cy="46" r="3" fill="#92400E" />

      {/* Mouth */}
      {state === 'sad' ? (
        // Sad mouth
        <path
          d="M 54 52 Q 60 49, 66 52"
          stroke="#92400E"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : state === 'confused' ? (
        // Confused mouth
        <path
          d="M 54 52 L 66 52"
          stroke="#92400E"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        // Happy smile
        <path
          d="M 54 52 Q 60 56, 66 52"
          stroke="#92400E"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Whiskers */}
      <line x1="40" y1="44" x2="30" y2="42" stroke="#92400E" strokeWidth="1" />
      <line x1="40" y1="48" x2="30" y2="50" stroke="#92400E" strokeWidth="1" />
      <line x1="80" y1="44" x2="90" y2="42" stroke="#92400E" strokeWidth="1" />
      <line x1="80" y1="48" x2="90" y2="50" stroke="#92400E" strokeWidth="1" />

      {/* Front paws */}
      <ellipse
        cx="48"
        cy="85"
        rx="6"
        ry="8"
        fill="#D97706"
      />
      <ellipse
        cx="72"
        cy="85"
        rx="6"
        ry="8"
        fill="#D97706"
      />

      {/* Paw pads */}
      <ellipse cx="48" cy="88" rx="3" ry="4" fill="#FCD34D" />
      <ellipse cx="72" cy="88" rx="3" ry="4" fill="#FCD34D" />

      {/* Holding acorn (when loading or idle) */}
      {(state === 'idle' || state === 'loading') && (
        <g className={state === 'loading' ? 'animate-bounce-acorn' : ''}>
          {/* Acorn body */}
          <ellipse cx="60" cy="58" rx="4" ry="5" fill="#92400E" />
          {/* Acorn cap */}
          <path
            d="M 56 55 Q 60 53, 64 55 L 64 58 L 56 58 Z"
            fill="#78350F"
          />
        </g>
      )}

      {/* Confused question mark */}
      {state === 'confused' && (
        <g opacity="0.8">
          <text
            x="85"
            y="30"
            fontSize="20"
            fill="#D97706"
            className="animate-float"
          >
            ?
          </text>
        </g>
      )}

      {/* Sleeping Z's */}
      {state === 'sleeping' && (
        <g className="animate-sleep-z">
          <text x="80" y="25" fontSize="16" fill="#D97706" opacity="0.6">Z</text>
          <text x="88" y="18" fontSize="14" fill="#D97706" opacity="0.4">z</text>
          <text x="94" y="13" fontSize="12" fill="#D97706" opacity="0.2">z</text>
        </g>
      )}

      <style>
        {`
          @keyframes tail-wag {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(15deg); }
          }

          @keyframes blink {
            0%, 90%, 100% { opacity: 1; }
            95% { opacity: 0; }
          }

          @keyframes bounce-acorn {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
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

          .animate-tail-wag {
            animation: tail-wag 1s ease-in-out infinite;
            transform-origin: 30px 40px;
          }

          .animate-blink {
            animation: blink 3s ease-in-out infinite;
          }

          .animate-bounce-acorn {
            animation: bounce-acorn 1s ease-in-out infinite;
          }

          .animate-float {
            animation: float 2s ease-in-out infinite;
          }

          .animate-sleep-z {
            animation: sleep-z 2s ease-in-out infinite;
          }
        `}
      </style>
    </svg>
  );
}
