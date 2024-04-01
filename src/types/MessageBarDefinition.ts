import { MessageBarType } from "@fluentui/react"

/**
 * Definition of a message bar
 */
export type MessageBarDefinition = {
  type: MessageBarType;
  text: string;
  isMultiLine: boolean;
}
