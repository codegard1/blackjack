// Return a random index number for a given array
export function getRandomIndex<T>(arr: T[]): number {
  if (arr.length === 0) {
    throw new Error("Array is empty. Cannot get a random index.");
  }
  return Math.floor(Math.random() * arr.length);
}
