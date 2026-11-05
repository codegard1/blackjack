import { BrandVariants } from '@fluentui/react-components';
import { AccentKey } from '../types';

export interface BrandPreset {
  /** name shown in the options panel */
  label: string;
  /** the 16-step color ramp a Fluent theme is built from */
  ramp: BrandVariants;
}

/**
 * Brand color presets. 'blue' is Fluent's own web ramp; the others keep the same
 * luminance at every step, so text contrast on buttons and links is the same for
 * each accent in both the light and the dark theme.
 */
export const brandPresets: Record<AccentKey, BrandPreset> = {
  blue: {
    label: 'Blue',
    ramp: { 10: '#061724', 20: '#082338', 30: '#0a2e4a', 40: '#0c3b5e', 50: '#0e4775', 60: '#0f548c', 70: '#115ea3', 80: '#0f6cbd', 90: '#2886de', 100: '#479ef5', 110: '#62abf5', 120: '#77b7f7', 130: '#96c6fa', 140: '#b4d6fa', 150: '#cfe4fa', 160: '#ebf3fc' },
  },
  teal: {
    label: 'Teal',
    ramp: { 10: '#041916', 20: '#072622', 30: '#09322c', 40: '#0b4039', 50: '#0e4d45', 60: '#105c52', 70: '#12685c', 80: '#15776a', 90: '#1a9383', 100: '#1ead9a', 110: '#21baa6', 120: '#23c7b1', 130: '#26d9c1', 140: '#70e6d6', 150: '#a6efe5', 160: '#daf8f4' },
  },
  green: {
    label: 'Green',
    ramp: { 10: '#07190c', 20: '#0b2712', 30: '#0f3318', 40: '#13411e', 50: '#174f25', 60: '#1b5e2c', 70: '#1f6a31', 80: '#237a39', 90: '#2c9646', 100: '#33b052', 110: '#37be59', 120: '#48ca68', 130: '#73d68c', 140: '#9ce2ae', 150: '#bfeccb', 160: '#e4f7e8' },
  },
  crimson: {
    label: 'Crimson',
    ramp: { 10: '#2f070d', 20: '#450a14', 30: '#5a0d1a', 40: '#711020', 50: '#881327', 60: '#a1172e', 70: '#b51a34', 80: '#cf1e3b', 90: '#e54c65', 100: '#eb7689', 110: '#ee899a', 120: '#f19aa8', 130: '#f4b0bb', 140: '#f7c6ce', 150: '#fadadf', 160: '#fdeff1' },
  },
  violet: {
    label: 'Violet',
    ramp: { 10: '#1e0c32', 20: '#2d134b', 30: '#3b1963', 40: '#4b1f7e', 50: '#5b2698', 60: '#6c2db4', 70: '#7a33cb', 80: '#8848d1', 90: '#9e6ada', 100: '#b188e1', 110: '#bb97e5', 120: '#c4a5e8', 130: '#d1b8ed', 140: '#ddcbf2', 150: '#e9ddf6', 160: '#f5f0fb' },
  },
};
