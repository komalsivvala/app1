import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useI18n } from '@/i18n/use-i18n';

import { AppText } from './AppText';

export interface ExamTimerProps {
  /** Wall-clock deadline; remaining time is always recomputed from it. */
  deadline: number;
  totalMs: number;
  now: () => number;
  onExpire: () => void;
}

const TICK_MS = 250;
const DANGER_FRACTION = 0.2;

function format(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Isolated leaf: the single 250 ms interval lives here, so a tick re-renders
 * this component and nothing else. A thin 3 px bar + numeric readout. It
 * shifts to danger ONCE, at the final 20%, and only the bar — no flashing,
 * no pulsing, no sound. Screen readers hear it at 50% and 10% only.
 */
export function ExamTimer({ deadline, totalMs, now, onExpire }: ExamTimerProps) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - now()));
  const expired = useRef(false);
  const announced = useRef<{ half: boolean; tenth: boolean }>({ half: false, tenth: false });

  useEffect(() => {
    expired.current = false;
    announced.current = { half: false, tenth: false };
    const tick = () => {
      const left = Math.max(0, deadline - now());
      setRemaining(left);
      const fraction = totalMs > 0 ? left / totalMs : 0;
      if (fraction <= 0.5 && !announced.current.half) {
        announced.current.half = true;
        AccessibilityInfo.announceForAccessibility(t('exam.timeA11y', { percent: 50 }));
      }
      if (fraction <= 0.1 && !announced.current.tenth) {
        announced.current.tenth = true;
        AccessibilityInfo.announceForAccessibility(t('exam.timeA11y', { percent: 10 }));
      }
      if (left <= 0 && !expired.current) {
        expired.current = true;
        clearInterval(id);
        onExpire();
      }
    };
    const id = setInterval(tick, TICK_MS);
    tick();
    return () => clearInterval(id);
  }, [deadline, totalMs, now, onExpire, t]);

  const fraction = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
  const barColor = fraction <= DANGER_FRACTION ? palette.danger.fill : palette.accent.fill;

  return (
    <View accessibilityRole="timer" accessibilityLabel={format(remaining)} testID="exam-timer">
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: barColor }]} testID="exam-timer-bar" />
      </View>
      <AppText variant="caption" color="secondary" align="right" style={styles.readout} testID="exam-timer-readout">
        {format(remaining)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 3, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%' },
  readout: { marginTop: 4, fontVariant: ['tabular-nums'] },
});
