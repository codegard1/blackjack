import { MessageBarType } from "@fluentui/react"

export type MessageBarDefinition = {
  type: MessageBarType;
  text: string;
  isMultiLine: boolean;
}
