import { ISuit } from "../types/ISuit";
import { TSuit } from "../types/TSuit";

/**
 * All the playing cards in a pack bearing the same symbol
 */
export class Suit implements ISuit {
  public single: TSuit;
  public plural: string;
  public short: string;

  constructor(single: TSuit) {
    this.single = single;
    this.plural = single + 's';
    this.short = single.substring(0, 1).toUpperCase();
  }

  /**
   * 
   * @returns all suit values as an array of strings
   */
  static suits(): TSuit[] {
    return ['Heart', 'Club', 'Spade', 'Diamond'];
  }
}
