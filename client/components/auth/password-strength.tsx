'use client';

type Props = {
  password: string;
};

export default function PasswordStrength({ password }: Props) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  const getStrength = () => {
    if (!password) return '';
    if (passedCount <= 2) return 'Weak';
    if (passedCount === 3) return 'Medium';
    return 'Strong';
  };

  const getColor = () => {
    if (passedCount <= 2) return 'bg-red-500';
    if (passedCount === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const strength = getStrength();

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Label */}
      {password && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Password Strength</span>
            <span>{strength}</span>
          </div>

          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full transition-all ${getColor()}`}
              style={{ width: `${(passedCount / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-1 text-sm">
        <Rule passed={checks.length} text="At least 8 characters" />
        <Rule passed={checks.uppercase} text="One uppercase letter" />
        <Rule passed={checks.number} text="One number" />
        <Rule passed={checks.special} text="One special character" />
      </div>
    </div>
  );
}

function Rule({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{passed ? '✔' : '✖'}</span>
      <span className={passed ? 'text-green-600' : 'text-gray-500'}>
        {text}
      </span>
    </div>
  );
}
