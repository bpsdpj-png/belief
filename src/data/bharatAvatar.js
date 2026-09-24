// Bharat's Full-Body Avatar Life & Mindset Configuration

export const BHARAT_ACTIVITIES = [
  {
    id: "standing",
    name: "Poised & Disciplined",
    short: "Poised",
    emoji: "👔",
    image: "/avatars/bharat_standing.jpg",
    badge: "Centered Trader",
    vibe: "Calm & Grounded",
    routineReason: "Observing market dynamics with zero emotion.",
    quote: "The market moves on math and human nature. I remain completely poised, centered, and disciplined.",
    accentColor: "var(--color-gold)",
    glowColor: "rgba(198, 167, 94, 0.35)",
  },
  {
    id: "meditation",
    name: "Mountain Meditation",
    short: "Zen Yogi",
    emoji: "🧘",
    image: "/avatars/bharat_meditation.jpg",
    badge: "Mind Mastery",
    vibe: "Inner Stillness",
    routineReason: "Mastering the dawn through stillness and breathwork.",
    quote: "Surrendering to inner silence. Violent volatility cannot shake a trader whose mind is rooted in peace.",
    accentColor: "var(--color-gold)",
    glowColor: "rgba(245, 158, 11, 0.45)",
  },
  {
    id: "workout",
    name: "Pushups & Fitness",
    short: "Gym & Pushups",
    emoji: "💪",
    image: "/avatars/bharat_workout.jpg",
    badge: "Iron Discipline",
    vibe: "Physical Power",
    routineReason: "Honoring Surya Namaskar & physical workouts.",
    quote: "Command the physical vessel first. Physical grit and discipline directly translate into trading execution.",
    accentColor: "var(--color-win)",
    glowColor: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: "cricket",
    name: "Playing Cricket",
    short: "Cricket Match",
    emoji: "🏏",
    image: "/avatars/bharat_cricket.jpg",
    badge: "Athletic Focus",
    vibe: "Perfect Timing",
    routineReason: "Post-market sports, hand-eye coordination & recreation.",
    quote: "Watch the ball onto the bat. Wait patiently for the loose delivery, then strike with decisive confidence!",
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.4)",
  },
  {
    id: "reading",
    name: "Evening Reading & Juice",
    short: "Reading & Learning",
    emoji: "📖",
    image: "/avatars/bharat_reading.jpg",
    badge: "Compound Knowledge",
    vibe: "Intellectual Growth",
    routineReason: "Evening wind-down with books and clean nutrition.",
    quote: "Nourishing intellect and body. True wealth is compounding knowledge and clean focus day after day.",
    accentColor: "#A78BFA",
    glowColor: "rgba(167, 139, 250, 0.4)",
  },
  {
    id: "romance",
    name: "Rooftop Romance & Charm",
    short: "Rooftop Date",
    emoji: "🌹",
    image: "/avatars/bharat_romance.jpg",
    badge: "Charismatic Life",
    vibe: "Balanced Lifestyle",
    routineReason: "Evening leisure, vibrant romance, and celebrating life.",
    quote: "Trade with cold discipline so you can enjoy life's warmest moments with charm, laughter, and style.",
    accentColor: "#F43F5E",
    glowColor: "rgba(244, 63, 94, 0.4)",
  },
  {
    id: "profit",
    name: "Profit & SOP Triumph",
    short: "Triumph",
    emoji: "📈",
    image: "/avatars/bharat_profit.jpg",
    badge: "₹20 Crore Vision",
    vibe: "Process Respected",
    routineReason: "Profitable session with 100% SOP execution honored.",
    quote: "Mastery in action! Both legs hedged, stops respected, zero impulse trades. The ₹20 Crore vision is unfolding!",
    accentColor: "var(--color-win)",
    glowColor: "rgba(16, 185, 129, 0.5)",
  },
];

export function getBharatActivityById(id) {
  return BHARAT_ACTIVITIES.find((a) => a.id === id) || BHARAT_ACTIVITIES[0];
}

/**
 * Automatically computes which activity/mood Bharat is in based on:
 * - Time of day
 * - Today's completed habits
 * - Today's SOP completion & trading P&L
 */
export function getAutoBharatActivity({
  habitsMap = {},
  sopMap = {},
  isSopHonored = false,
  todayPnl = 0,
}) {
  const hour = new Date().getHours();

  // 1. If 100% SOP honored with green day or full 5/5 rules completed
  const sopCount = Object.values(sopMap).filter(Boolean).length;
  if (isSopHonored && (todayPnl > 0 || sopCount >= 5)) {
    return {
      activity: getBharatActivityById("profit"),
      modeName: "Automated: Process Respected (★ 100% SOP)",
    };
  }

  // 2. Early morning (05:00 - 08:00 AM)
  if (hour >= 5 && hour < 8) {
    if (habitsMap["08"] || habitsMap["01"] || habitsMap["02"]) {
      return {
        activity: getBharatActivityById("workout"),
        modeName: "Automated: Morning Fitness & Surya Namaskar",
      };
    }
    return {
      activity: getBharatActivityById("meditation"),
      modeName: "Automated: Morning Dawn Meditation",
    };
  }

  // 3. Morning workout / gym hour (08:00 - 09:15 AM)
  if (hour >= 8 && hour < 9) {
    return {
      activity: getBharatActivityById("workout"),
      modeName: "Automated: Morning Workout & Gym Routine",
    };
  }

  // 4. Market hours (09:15 AM - 03:30 PM)
  if (hour >= 9 && hour < 16) {
    return {
      activity: getBharatActivityById("standing"),
      modeName: "Automated: Market Session Poised & Focused",
    };
  }

  // 5. Late afternoon / sports recreation (04:00 - 06:45 PM)
  if (hour >= 16 && hour < 19) {
    return {
      activity: getBharatActivityById("cricket"),
      modeName: "Automated: Afternoon Sports & Cricket",
    };
  }

  // 6. Evening rooftop romance & social (07:00 - 09:30 PM)
  if (hour >= 19 && hour < 22) {
    return {
      activity: getBharatActivityById("romance"),
      modeName: "Automated: Evening Rooftop Leisure & Social Charm",
    };
  }

  // 7. Night relaxation & reading (09:30 PM onwards / late night)
  if (hour >= 22 || hour < 5) {
    return {
      activity: getBharatActivityById("reading"),
      modeName: "Automated: Night Reading & Journaling",
    };
  }

  // Fallbacks if specific habits are checked
  if (habitsMap["03"]) {
    return {
      activity: getBharatActivityById("meditation"),
      modeName: "Automated: Meditation Habit Active",
    };
  }
  if (habitsMap["08"] || habitsMap["01"]) {
    return {
      activity: getBharatActivityById("workout"),
      modeName: "Automated: Gym Habit Active",
    };
  }
  if (habitsMap["10"]) {
    return {
      activity: getBharatActivityById("reading"),
      modeName: "Automated: Reading Habit Active",
    };
  }

  return {
    activity: getBharatActivityById("standing"),
    modeName: "Automated: Poised & Ready",
  };
}
