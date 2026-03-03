export type Trivia = {
  fact: string;
  category: string;
  emoji: string;
};

const TRIVIA: Trivia[] = [
  {
    fact: "In 2021, a $0.30 semiconductor chip halted $200B in global car production — the most expensive bottleneck in modern manufacturing history.",
    category: "Supply Chain Crisis",
    emoji: "⚙️",
  },
  {
    fact: "The average supermarket carries 30,000 SKUs but relies on just 20 of them for 50% of its revenue.",
    category: "Retail Reality",
    emoji: "🛒",
  },
  {
    fact: "Amazon processes over 1.6 million packages per day — made possible by demand forecasting models trained on years of purchase history.",
    category: "Demand Forecasting",
    emoji: "📦",
  },
  {
    fact: "The 'Bullwhip Effect' was named in 1961 by MIT's Jay Forrester. Small retail demand swings amplify into massive inventory waves upstream.",
    category: "Forecasting Theory",
    emoji: "📊",
  },
  {
    fact: "Toyota's Just-In-Time system was inspired by American supermarkets. Taiichi Ohno visited in 1956 and watched shelves restock only when they ran low.",
    category: "Supply Chain History",
    emoji: "🏭",
  },
  {
    fact: "Walmart shares real-time sales data with 3,500 suppliers, allowing them to restock before Walmart even places an order.",
    category: "Supply Chain Innovation",
    emoji: "🔄",
  },
  {
    fact: "The COVID-19 toilet paper shortage wasn't a production problem — it was a forecasting failure. Factories made the same amount; people just bought 8 weeks' worth at once.",
    category: "Demand Shock",
    emoji: "📉",
  },
  {
    fact: "A 1% improvement in forecast accuracy typically reduces inventory carrying costs by 0.5–2%. At scale, that's millions saved.",
    category: "Forecasting Impact",
    emoji: "🎯",
  },
  {
    fact: "iPhones source components from 43 countries before being assembled and shipped globally — one of the world's most complex supply chains.",
    category: "Global Supply Chain",
    emoji: "🌍",
  },
  {
    fact: "Seasonal demand misforecasting costs US retailers $300B annually in excess inventory, plus $45B in lost sales from stockouts.",
    category: "Retail Forecasting",
    emoji: "📅",
  },
  {
    fact: "The shipping container, invented in 1956 by Malcolm McLean, reduced cargo loading costs by 97% and single-handedly enabled modern global trade.",
    category: "Supply Chain History",
    emoji: "🚢",
  },
  {
    fact: "In 1999, Nike lost $100M in a single quarter after its forecasting software ordered too much of the wrong styles and too little of the right ones.",
    category: "Forecasting Failure",
    emoji: "👟",
  },
  {
    fact: "Every Christmas, Amazon has a 47-day window to get forecasting right. Miss it, and overseas orders can't arrive in time for the holiday.",
    category: "Seasonal Forecasting",
    emoji: "🎄",
  },
  {
    fact: "Dead stock (unsold inventory) costs UK retailers alone £32B per year — most of which could be avoided with better demand planning.",
    category: "Inventory Costs",
    emoji: "💸",
  },
  {
    fact: "Zara can go from design to store shelf in 15 days. The industry average is 6 months. The secret? Tight feedback loops between stores and suppliers.",
    category: "Fast Fashion",
    emoji: "⚡",
  },
  {
    fact: "Milk demand in the UK spikes 30% during major football tournaments. Retailers who miss this signal run out within hours of kickoff.",
    category: "Event-Based Forecasting",
    emoji: "⚽",
  },
  {
    fact: "The 2011 Thailand floods disrupted 45% of global hard drive production for 18 months, costing the tech industry over $1 trillion in supply losses.",
    category: "Supply Chain Risk",
    emoji: "🌊",
  },
  {
    fact: "FMCG companies using AI-driven demand forecasting see up to 15% fewer stockouts and 35% less excess inventory compared to manual planning.",
    category: "AI Forecasting",
    emoji: "🤖",
  },
  {
    fact: "Forecast error for new product launches averages 40–60%. For products with 2+ years of sales history, it drops to 10–20%.",
    category: "Forecasting Benchmarks",
    emoji: "📐",
  },
  {
    fact: "During the 2008 financial crisis, P&G's demand planners noticed a spike in lipstick sales — a classic 'lipstick index' signal that consumers were trading down.",
    category: "Demand Signal",
    emoji: "💄",
  },
  {
    fact: "7-Eleven Japan pioneered convenience store demand forecasting in the 1970s. Daily manager predictions for each product still drive 38% higher sales than competitors.",
    category: "Demand Forecasting",
    emoji: "🏪",
  },
  {
    fact: "Costco deliberately limits its selection to ~4,000 SKUs versus Walmart's 142,000. Fewer choices means more predictable demand and higher forecast accuracy.",
    category: "Retail Strategy",
    emoji: "🏬",
  },
  {
    fact: "The 'last mile' of delivery accounts for 53% of total shipping costs but only 1–2% of the total distance traveled.",
    category: "Supply Chain Costs",
    emoji: "🚚",
  },
  {
    fact: "The average US grocery store turns over its entire inventory every 2–3 weeks. Fresh produce departments do it in days — forecasting error tolerance is razor-thin.",
    category: "Retail Forecasting",
    emoji: "🥬",
  },
  {
    fact: "A single day of excess inventory for a $10B retailer costs roughly $1M in carrying costs, based on the typical 10–15% annual holding rate.",
    category: "Inventory Costs",
    emoji: "💰",
  },
  {
    fact: "Apple keeps only 5 days of inventory on hand — compared to the industry average of 45+ days. It's one of the tightest supply chains ever operated at scale.",
    category: "Inventory Strategy",
    emoji: "🍎",
  },
  {
    fact: "In 2013, Mattel was stuck with 23 million unsold Barbie dolls after overforecasting demand, leading to a $210M inventory write-down.",
    category: "Forecasting Failure",
    emoji: "👧",
  },
  {
    fact: "The Economic Order Quantity formula, still used in inventory management worldwide, was developed in 1913 — the same year the Ford assembly line was invented.",
    category: "Forecasting Theory",
    emoji: "📐",
  },
  {
    fact: "Supply chain disruptions cost the average company 42% of one year's profits over a 10-year period, according to McKinsey research.",
    category: "Supply Chain Risk",
    emoji: "⚠️",
  },
  {
    fact: "Black Friday creates the largest single-day demand spike in retail history. Target and Walmart start forecasting Black Friday inventory 6 months in advance.",
    category: "Seasonal Forecasting",
    emoji: "🛍️",
  },
  {
    fact: "The fashion industry destroys an estimated $500B worth of unsold clothing annually — largely a failure of demand forecasting and overproduction.",
    category: "Inventory Waste",
    emoji: "👗",
  },
  {
    fact: "IKEA transports furniture flat-packed to maximize space efficiency — saving an estimated $80B in shipping costs annually and reshaping global retail logistics.",
    category: "Supply Chain Innovation",
    emoji: "📦",
  },
  {
    fact: "Demand forecasting for pharmaceuticals is uniquely volatile: a single disease outbreak can shift demand 10x overnight, while patent expirations can drop it to near zero in weeks.",
    category: "Demand Forecasting",
    emoji: "💊",
  },
  {
    fact: "In 2010, Hershey's experienced a Halloween chocolate shortage after upgrading its ERP system mid-summer, disrupting its seasonal forecast and production plan.",
    category: "Forecasting Failure",
    emoji: "🍫",
  },
  {
    fact: "The average manufacturing company forecasts 50,000+ SKUs — but 80% of revenue typically comes from fewer than 1,000 of them. Pareto's Law is relentless.",
    category: "Forecasting Benchmarks",
    emoji: "📊",
  },
  {
    fact: "A 5°C temperature change can shift ice cream sales by 30% and umbrella demand by 400%. Weather is one of the most powerful — and underused — demand signals in retail.",
    category: "Demand Signal",
    emoji: "🌤️",
  },
  {
    fact: "Amazon's 'anticipatory shipping' patent (2013) proposes shipping products to a region before customers even order them, based on predictive demand models.",
    category: "AI Forecasting",
    emoji: "🤖",
  },
  {
    fact: "Beer demand spikes 8–20% during major sporting events. Brewers build match schedules directly into their forecasting models.",
    category: "Event-Based Forecasting",
    emoji: "🍺",
  },
  {
    fact: "Starbucks uses demand forecasting to pre-position baristas before rush hours — predicting customer volume 30 minutes in advance, by individual store location.",
    category: "Demand Forecasting",
    emoji: "☕",
  },
  {
    fact: "The 2021 Suez Canal blockage (6 days) delayed an estimated $9.6B worth of goods per day, triggering emergency forecast revisions across thousands of supply chains.",
    category: "Supply Chain Risk",
    emoji: "🚢",
  },
  {
    fact: "China's Singles Day generates more sales in 24 hours than Black Friday and Cyber Monday combined — with Alibaba processing 583,000 orders per second at peak.",
    category: "Demand Shock",
    emoji: "📱",
  },
  {
    fact: "Nestlé runs over 2,000 demand planning models simultaneously, updating forecasts every week across more than 100,000 SKUs worldwide.",
    category: "Demand Forecasting",
    emoji: "🌐",
  },
  {
    fact: "Procter & Gamble's demand-driven supply chain model saved the company $1B in logistics costs in its first year of implementation.",
    category: "Supply Chain Innovation",
    emoji: "🔄",
  },
  {
    fact: "The term 'logistics' traces back to the French military theorist Antoine-Henri Jomini, who in 1838 described it as the science of moving armies — now the science of moving everything.",
    category: "Supply Chain History",
    emoji: "📜",
  },
  {
    fact: "The concept of 'safety stock' was formalized by statistician George Plossl in 1962 and remains the backbone of inventory planning in almost every industry today.",
    category: "Forecasting Theory",
    emoji: "🛡️",
  },
  {
    fact: "During WWII, the US military developed operations research to optimize supply logistics. Many forecasting algorithms still in use today trace back to wartime distribution problems.",
    category: "Supply Chain History",
    emoji: "🎖️",
  },
  {
    fact: "The global cold chain (refrigerated logistics) market is worth $280B and growing at 7% annually — requiring forecasts for both demand and temperature-sensitive spoilage rates.",
    category: "Supply Chain Innovation",
    emoji: "❄️",
  },
  {
    fact: "The 1970s oil crisis forced manufacturers to treat energy prices as a critical forecast variable — triggering the first widespread use of scenario-based planning in industry.",
    category: "Supply Chain History",
    emoji: "⛽",
  },
  {
    fact: "Over-ordering by just 10% across a mid-size food distributor compounds into millions in waste annually — the hidden cost that makes accurate forecasting a profit lever, not just an ops tool.",
    category: "Forecasting Impact",
    emoji: "🎯",
  },
  {
    fact: "The global supply chain generates more data in a single day than was produced in the entire 20th century. The challenge isn't collecting data — it's using it to forecast accurately.",
    category: "AI Forecasting",
    emoji: "💾",
  },
  {
    fact: "India's festive season (Dussehra to Diwali) compresses 3 months of normal consumer spending into 6 weeks. FMCG brands that miscalculate inventory in September pay for it in November.",
    category: "Seasonal Forecasting",
    emoji: "🪔",
  },
];

const QUEUE_KEY = 'ld_trivia_queue';

function buildShuffledQueue(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function getNextTrivia(): Trivia {
  let queue: number[] = [];

  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    queue = stored ? JSON.parse(stored) : [];
  } catch {
    // localStorage unavailable (SSR, private mode)
  }

  if (!Array.isArray(queue) || queue.length === 0) {
    queue = buildShuffledQueue(TRIVIA.length);
  }

  const index = queue.shift()!;

  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore write failures
  }

  return TRIVIA[index];
}
