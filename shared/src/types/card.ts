export interface Card {
  id: string;
  name: string;
  description: string;
  attack: number;
  defense: number;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardData {
  name: string;
  description: string;
  attack: number;
  defense: number;
  cost: number;
}

export interface UpdateCardData {
  name?: string;
  description?: string;
  attack?: number;
  defense?: number;
  cost?: number;
}
