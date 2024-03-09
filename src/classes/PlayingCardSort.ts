import { IPlayingCardSort } from "../interfaces";

export class PlayingCardSort implements IPlayingCardSort {
  public value: number;
  public name: string;

  constructor(value: number) {
    this.value = value;
    switch (value) {
      case 11:
        this.name = "J";
        break;
      case 12:
        this.name = "Q";
        break;
      case 13:
        this.name = "K";
        break;
      case 14:
        this.name = "A";
        break;
      default:
        this.name = value.toString();
    }
  }
}
