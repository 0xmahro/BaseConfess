export interface Confession {
  id:             number;
  wallet:         string;
  text:           string | null;
  hash:           string;
  timestamp:      string;
  likes:          number;
  dislikes:       number;
  tips_received:  number;
  created_at:     string;
}

export interface Vote {
  id:            string;
  confession_id: number;
  wallet:        string;
  vote:          1 | -1;
  timestamp:     string;
}

export interface Tip {
  id:            string;
  confession_id: number;
  from_wallet:   string;
  to_wallet:     string;
  amount:        string;
  timestamp:     string;
}

export type VoteType = 1 | -1;

/** Map of confessionId → user's vote (1, -1, or undefined if not voted) */
export type UserVoteMap = Record<number, VoteType | undefined>;
