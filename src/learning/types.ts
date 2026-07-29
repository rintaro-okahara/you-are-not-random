import type { ProbabilityVector } from "../domain/types";
import type { LearningStats } from "./learningStats";

export interface Expert {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly suspicionText: string;
  predictHuman(stats: LearningStats): ProbabilityVector;
}
