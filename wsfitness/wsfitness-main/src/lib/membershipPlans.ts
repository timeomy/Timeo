export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  validityLabel: string;
  category: 'yoga' | 'zumba' | 'spinning' | 'walkin' | 'membership' | 'coach_training';
  sessions?: number;
}

export interface PlanCategory {
  id: string;
  name: string;
  description?: string;
  plans: MembershipPlan[];
}

export const membershipCategories: PlanCategory[] = [
  {
    id: 'yoga',
    name: 'Yoga',
    description: 'Yoga class sessions',
    plans: [
      {
        id: 'yoga-1',
        name: 'Yoga - 1 Session',
        price: 40,
        validityDays: 7,
        validityLabel: 'Drop-in',
        category: 'yoga',
        sessions: 1,
      },
      {
        id: 'yoga-4',
        name: 'Yoga - 4 Sessions',
        price: 140,
        validityDays: 45,
        validityLabel: '1 Month 2 Weeks',
        category: 'yoga',
        sessions: 4,
      },
      {
        id: 'yoga-8',
        name: 'Yoga - 8 Sessions',
        price: 240,
        validityDays: 75,
        validityLabel: '2 Months 2 Weeks',
        category: 'yoga',
        sessions: 8,
      },
    ],
  },
  {
    id: 'zumba',
    name: 'Zumba Class',
    description: 'High-energy dance fitness',
    plans: [
      {
        id: 'zumba-1',
        name: 'Zumba - 1 Session',
        price: 15,
        validityDays: 7,
        validityLabel: 'Drop-in',
        category: 'zumba',
        sessions: 1,
      },
      {
        id: 'zumba-4',
        name: 'Zumba - 4 Sessions',
        price: 60,
        validityDays: 45,
        validityLabel: '1 Month 2 Weeks',
        category: 'zumba',
        sessions: 4,
      },
      {
        id: 'zumba-10',
        name: 'Zumba - 10 Sessions',
        price: 108,
        validityDays: 75,
        validityLabel: '2 Months 2 Weeks',
        category: 'zumba',
        sessions: 10,
      },
    ],
  },
  {
    id: 'spinning',
    name: 'Spinning Class',
    description: 'High-intensity cycling',
    plans: [
      {
        id: 'spinning-1',
        name: 'Spinning - 1 Session',
        price: 40,
        validityDays: 7,
        validityLabel: 'Drop-in',
        category: 'spinning',
        sessions: 1,
      },
      {
        id: 'spinning-4',
        name: 'Spinning - 4 Sessions',
        price: 140,
        validityDays: 45,
        validityLabel: '1 Month 2 Weeks',
        category: 'spinning',
        sessions: 4,
      },
      {
        id: 'spinning-8',
        name: 'Spinning - 8 Sessions',
        price: 240,
        validityDays: 75,
        validityLabel: '2 Months 2 Weeks',
        category: 'spinning',
        sessions: 8,
      },
    ],
  },
  {
    id: 'walkin',
    name: 'Walk-In',
    description: 'Day access pass',
    plans: [
      {
        id: 'walkin-day',
        name: 'Day Pass',
        price: 15,
        validityDays: 1,
        validityLabel: '1 Day',
        category: 'walkin',
      },
    ],
  },
  {
    id: 'membership',
    name: 'Gym Membership',
    description: 'Full gym access',
    plans: [
      {
        id: 'membership-1month',
        name: 'Membership - 1 Month',
        price: 158,
        validityDays: 30,
        validityLabel: '1 Month',
        category: 'membership',
      },
      {
        id: 'membership-3months',
        name: 'Membership - 3 Months',
        price: 388,
        validityDays: 90,
        validityLabel: '3 Months',
        category: 'membership',
      },
      {
        id: 'membership-6months',
        name: 'Membership - 6 Months',
        price: 728,
        validityDays: 180,
        validityLabel: '6 Months',
        category: 'membership',
      },
      {
        id: 'membership-1year',
        name: 'Membership - 1 Year',
        price: 1440,
        validityDays: 365,
        validityLabel: '1 Year',
        category: 'membership',
      },
    ],
  },
  {
    id: 'coach_training',
    name: 'Coach Training',
    description: 'Personal training sessions (Non-refundable & Non-exchangeable)',
    plans: [
      {
        id: 'ct-1',
        name: 'Coach Training - 1 Session',
        price: 58,
        validityDays: 30,
        validityLabel: '1 Month',
        category: 'coach_training',
        sessions: 1,
      },
      {
        id: 'ct-16',
        name: 'Coach Training - 16 Sessions',
        price: 618,
        validityDays: 45,
        validityLabel: '1 Month 2 Weeks',
        category: 'coach_training',
        sessions: 16,
      },
      {
        id: 'ct-48',
        name: 'Coach Training - 48 Sessions',
        price: 1518,
        validityDays: 170,
        validityLabel: '5 Months 18 Days',
        category: 'coach_training',
        sessions: 48,
      },
      {
        id: 'ct-99',
        name: 'Coach Training - 99 Sessions',
        price: 2988,
        validityDays: 365,
        validityLabel: '1 Year',
        category: 'coach_training',
        sessions: 99,
      },
    ],
  },
];

export const getAllPlans = (): MembershipPlan[] => {
  return membershipCategories.flatMap(cat => cat.plans);
};

export const getPlanById = (id: string): MembershipPlan | undefined => {
  return getAllPlans().find(plan => plan.id === id);
};

export const formatPrice = (price: number): string => {
  return `RM ${price.toFixed(2)}`;
};

// Staff plan type - no expiry, no sessions
export const STAFF_PLAN_TYPE = 'Staff';
