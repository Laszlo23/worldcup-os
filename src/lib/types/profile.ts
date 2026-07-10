export type UserProfile = {
  id: string;
  walletPubkey: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  xHandle: string | null;
  farcasterFid: number | null;
  farcasterUsername: string | null;
  farcasterPfpUrl: string | null;
  socialVerifiedAt: string | null;
  joinedAt: string;
};

export type ProfileResponse = {
  profile: UserProfile;
  portfolio: {
    balance: number;
    inEscrow: number;
    pendingRewards: number;
    totalEarnings: number;
    openCount: number;
    wonCount: number;
  };
};
