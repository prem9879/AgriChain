// Mock data for mandi prices, 30-day history, and neighbor intelligence

const generateHistory = (basePrice, volatility) => {
    const history = [];
    const today = new Date();
    let price = basePrice;
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const change = (Math.random() - 0.48) * volatility;
        price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.4, price + change));
        history.push({
            date: date.toISOString().slice(0, 10),
            dateLabel: `${date.getDate()}/${date.getMonth() + 1}`,
            price: Math.round(price * 10) / 10,
        });
    }
    return history;
};

export const CROP_EMOJIS = {
    Onion: '🧅',
    Tomato: '🍅',
    Wheat: '🌾',
    Rice: '🍚',
    Potato: '🥔',
};

export const DISTRICTS = ['Nashik', 'Pune', 'Nagpur', 'Aurangabad', 'Solapur', 'Kolhapur'];
export const CROPS = ['Onion', 'Tomato', 'Wheat', 'Rice', 'Potato'];

const MANDI_DATA = {
    Nashik: {
        Onion: { price: 22.5, change: 2.4, mandi: 'Lasalgaon' },
        Tomato: { price: 18.0, change: -1.8, mandi: 'Pimpalgaon' },
        Wheat: { price: 27.5, change: 0.5, mandi: 'Nashik Main' },
        Rice: { price: 32.0, change: 1.2, mandi: 'Nashik Main' },
        Potato: { price: 15.0, change: -0.5, mandi: 'Deolali' },
    },
    Pune: {
        Onion: { price: 24.0, change: 1.5, mandi: 'Market Yard' },
        Tomato: { price: 20.5, change: 3.2, mandi: 'Gultekdi' },
        Wheat: { price: 28.0, change: 0.8, mandi: 'Hadapsar' },
        Rice: { price: 33.5, change: -0.3, mandi: 'Market Yard' },
        Potato: { price: 16.5, change: 1.0, mandi: 'Gultekdi' },
    },
    Nagpur: {
        Onion: { price: 21.0, change: -1.2, mandi: 'Kalamna' },
        Tomato: { price: 17.5, change: 2.0, mandi: 'Kalamna' },
        Wheat: { price: 26.5, change: 1.5, mandi: 'Itwari' },
        Rice: { price: 31.0, change: 0.7, mandi: 'Itwari' },
        Potato: { price: 14.5, change: -0.8, mandi: 'Kalamna' },
    },
    Aurangabad: {
        Onion: { price: 23.0, change: 1.0, mandi: 'Jalna Road' },
        Tomato: { price: 19.0, change: -0.5, mandi: 'City Mandi' },
        Wheat: { price: 27.0, change: -0.2, mandi: 'City Mandi' },
        Rice: { price: 32.5, change: 1.8, mandi: 'Jalna Road' },
        Potato: { price: 15.5, change: 0.3, mandi: 'City Mandi' },
    },
    Solapur: {
        Onion: { price: 20.5, change: -2.0, mandi: 'Akkalkot Road' },
        Tomato: { price: 16.0, change: 1.5, mandi: 'Main Market' },
        Wheat: { price: 26.0, change: 0.4, mandi: 'Main Market' },
        Rice: { price: 30.5, change: -1.0, mandi: 'Akkalkot Road' },
        Potato: { price: 14.0, change: 0.8, mandi: 'Main Market' },
    },
    Kolhapur: {
        Onion: { price: 23.5, change: 2.8, mandi: 'Shahu Market' },
        Tomato: { price: 21.0, change: -0.7, mandi: 'Shahupuri' },
        Wheat: { price: 28.5, change: 1.2, mandi: 'Shahupuri' },
        Rice: { price: 34.0, change: 0.5, mandi: 'Shahu Market' },
        Potato: { price: 16.0, change: -1.5, mandi: 'Shahupuri' },
    },
};

const NEIGHBOR_DATA = {
    Nashik: { Onion: 432, Tomato: 215, Wheat: 180, Rice: 120, Potato: 310 },
    Pune: { Onion: 350, Tomato: 280, Wheat: 150, Rice: 90, Potato: 195 },
    Nagpur: { Onion: 180, Tomato: 320, Wheat: 410, Rice: 270, Potato: 145 },
    Aurangabad: { Onion: 290, Tomato: 195, Wheat: 220, Rice: 160, Potato: 250 },
    Solapur: { Onion: 520, Tomato: 150, Wheat: 180, Rice: 140, Potato: 175 },
    Kolhapur: { Onion: 160, Tomato: 420, Wheat: 130, Rice: 100, Potato: 290 },
};

export const getMarketPrices = (district, crop) => {
    const data = MANDI_DATA[district]?.[crop];
    if (!data) {
        return { price: 0, change: 0, mandi: district, history: [] };
    }
    return {
        ...data,
        history: generateHistory(data.price, 2.5),
    };
};

export const getAllPricesForDistrict = (district) => {
    return CROPS.map((crop) => ({
        crop,
        emoji: CROP_EMOJIS[crop],
        ...getMarketPrices(district, crop),
    }));
};

export const getNeighborIntelligence = (district, crop) => {
    const farmerCount = NEIGHBOR_DATA[district]?.[crop] || 250;
    let level, color, message, suggestion;

    if (farmerCount > 400) {
        level = 'high';
        color = '#C62828';
        message = `⚠️ ज्यादा supply से भाव 15-20% गिर सकते हैं।`;
        const altDistrict = DISTRICTS.find(
            (d) => d !== district && (NEIGHBOR_DATA[d]?.[crop] || 300) < 200
        );
        suggestion = altDistrict
            ? `${altDistrict} मंडी try करें।`
            : 'कुछ दिन रुकें, supply कम होने का इंतज़ार करें।';
    } else if (farmerCount < 200) {
        level = 'low';
        color = '#2E7D32';
        message = '✅ कम competition — अच्छे भाव मिल सकते हैं';
        suggestion = 'आज बेचने का अच्छा मौका है!';
    } else {
        level = 'medium';
        color = '#E0A800';
        message = '🟡 सामान्य supply — भाव स्थिर रहने की संभावना';
        suggestion = 'बाज़ार की स्थिति सामान्य है।';
    }

    return { farmerCount, level, color, message, suggestion, district, crop };
};

export const BEST_SELLING_PERIOD = {
    Onion: { start: 15, end: 22, month: 'October', caption: 'October के तीसरे हफ्ते में भाव सबसे ज्यादा रहते हैं' },
    Tomato: { start: 5, end: 12, month: 'November', caption: 'November के पहले हफ्ते में भाव सबसे ज्यादा रहते हैं' },
    Wheat: { start: 10, end: 18, month: 'April', caption: 'April के दूसरे हफ्ते में भाव सबसे ज्यादा रहते हैं' },
    Rice: { start: 20, end: 28, month: 'December', caption: 'December के चौथे हफ्ते में भाव सबसे ज्यादा रहते हैं' },
    Potato: { start: 1, end: 10, month: 'March', caption: 'March के पहले हफ्ते में भाव सबसे ज्यादा रहते हैं' },
};
