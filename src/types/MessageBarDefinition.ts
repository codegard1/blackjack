/**
 * Definition of a message bar
 */
export type MessageIntent = 'info' | 'warning' | 'success' | 'error';

export type MessageBarDefinition = {
  type: MessageIntent;
  text: string;
  isMultiLine: boolean;
}
