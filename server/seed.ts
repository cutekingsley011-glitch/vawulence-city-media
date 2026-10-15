import { db } from './db';

export async function seedIfEmpty() {
  try {
    const existingPosts = await db.list('posts', { limit: 1 });
    if (existingPosts.items && existingPosts.items.length > 0) {
      return; // Already seeded
    }

    const now = new Date().toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    // Categories
    await db.add('categories', [
      { name: 'News', createdAt: now },
      { name: 'Entertainment', createdAt: now },
      { name: 'Sports', createdAt: now },
      { name: 'Politics', createdAt: now },
      { name: 'Campus', createdAt: now },
      { name: 'Vawulence', createdAt: now },
    ]);

    // Breaking news
    await db.add('breaking_news', [
      {
        text: '🔥 Breaking: Vawulence City Media 2026 goes live with Entertainment Without Border!',
        enabled: true,
        updatedAt: now,
      },
    ]);

    // Posts
    await db.add('posts', [
      {
        title: 'Ebonyi State University Students Set to Launch City-Wide Creative Fest',
        content: `Students of Ebonyi State University (EBSU) are gearing up for the largest youth creative exhibition of the season in Abakaliki.\n\nThe festival will bring together digital creators, musicians, skit makers, fashion designers, and tech enthusiasts from across the South-East.\n\nAccording to the student union representatives, the goal is to spotlight emerging street talents and provide networking opportunities with creative agencies across Nigeria.`,
        excerpt: 'Students of Ebonyi State University gear up for the largest youth creative exhibition of the season in Abakaliki.',
        category: 'Campus',
        imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format',
        videoUrl: null,
        isBreaking: false,
        status: 'published',
        viewCount: 1420,
        createdAt: yesterday,
      },
      {
        title: 'The Great Abakaliki Food Debate: Roadside Bukka vs Continental Lounges',
        content: `From waterworks road to CAS campus, the debate over who serves the realest taste of Abakaliki is heating up.\n\nWhile high-end lounges boast aesthetic plating and AC, the loyal patrons of roadside bukka insist that the secret to proper satisfaction is local herbs, fresh goat meat, and authentic street firewood.\n\n"You cannot compare ₦5,000 fancy rice to proper hot abacha with fried fish," declared a regular customer on Monday evening.`,
        excerpt: 'The eternal clash between street bukka goodness and modern fancy restaurants.',
        category: 'Entertainment',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format',
        videoUrl: null,
        isBreaking: false,
        status: 'published',
        viewCount: 2850,
        createdAt: twoDaysAgo,
      },
      {
        title: 'Tech & Creator Ecosystem Expands Across South-Eastern Nigeria',
        content: `Young software engineers, content creators, and remote workers are turning local spaces into energetic tech hubs.\n\nWith increased access to high-speed internet and co-working spaces, young people in the city are building products for international clients while staying rooted in their community.\n\nVCM caught up with several founders who shared their inspiring journeys of building from the ground up.`,
        excerpt: 'How tech hubs and remote workers are transforming the creative scene in the South-East.',
        category: 'News',
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format',
        videoUrl: null,
        isBreaking: true,
        status: 'published',
        viewCount: 3910,
        createdAt: now,
      },
    ]);

    // Vote Cards / Polls
    await db.add('vote_cards', [
      {
        title: 'Who has the best Jollof Rice in Nigeria?',
        option1Label: 'Party Jollof (Firewood)',
        option2Label: 'Homemade Jollof',
        option3Label: 'Roadside Bukka',
        option4Label: 'Fast Food Restaurant',
        option1Count: 342,
        option2Count: 189,
        option3Count: 88,
        option4Count: 35,
        isActive: true,
        status: 'active',
        createdAt: yesterday,
      },
      {
        title: 'Campus Lifestyle: Night Reading (TDB) vs Early Morning Cramming?',
        option1Label: 'All-Night Reading (TDB)',
        option2Label: 'Early Morning Reading',
        option3Label: 'Consistent Daily Study',
        option4Label: 'God will do it!',
        option1Count: 215,
        option2Count: 97,
        option3Count: 54,
        option4Count: 160,
        isActive: true,
        status: 'active',
        createdAt: twoDaysAgo,
      },
    ]);

    // Published Gists
    await db.add('gists', [
      {
        content: 'Someone came to Friday night groove wearing their roommate\'s shoes without asking, only to find the roommate at the same VIP table! The silence was louder than the DJ!',
        text: 'Someone came to Friday night groove wearing their roommate\'s shoes without asking, only to find the roommate at the same VIP table! The silence was louder than the DJ!',
        userId: null,
        status: 'published',
        createdAt: twoDaysAgo,
        publishedAt: yesterday,
      },
      {
        content: 'Project supervisor told my friend to change topic after she had already written 3 complete chapters. We are holding vigil for her sanity this evening.',
        text: 'Project supervisor told my friend to change topic after she had already written 3 complete chapters. We are holding vigil for her sanity this evening.',
        userId: null,
        status: 'published',
        createdAt: yesterday,
        publishedAt: now,
      },
    ]);

    // Events
    await db.add('events', [
      {
        title: 'VCM City Creators Live 2026',
        description: 'An evening of comedy, street photography exhibition, rap battles, and creative networking under the Abakaliki city lights.',
        venue: 'Township Central Plaza, Abakaliki',
        host: 'Vawulence City Media Crew',
        eventDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        eventTime: '5:00 PM WAT',
        isPaid: false,
        ticketPrice: 0,
        imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format',
        status: 'upcoming',
        restrictionTags: ['18+', 'Free Entry', 'Networking'],
        createdAt: now,
      },
    ]);

    // Marketplace items (prices stored in Kobo)
    await db.add('marketplace_items', [
      {
        name: 'Apple MacBook Pro M1 (16GB / 512GB SSD)',
        description: 'Clean UK used MacBook Pro with outstanding battery health (93%). Space Grey with original charger. Perfect for designers, devs, and students.',
        price: 45000000, // ₦450,000
        category: 'Electronics',
        howLongUsed: '6 months',
        location: 'Abakaliki / Enugu delivery',
        reasonForSale: 'Upgrading to M3',
        imageUrls: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format'],
        sellerWhatsapp: '08030430681',
        status: 'available',
        createdAt: yesterday,
      },
      {
        name: 'Professional Studio Ring Light with 2.1m Stand',
        description: '18-inch dimmable LED ring light with remote control and multi-phone mount. Excellent for TikTok, Reels, makeup, and live streaming.',
        price: 2800000, // ₦28,000
        category: 'Electronics',
        howLongUsed: 'Brand New In Box',
        location: 'Waterworks Road, Abakaliki',
        reasonForSale: 'Surplus inventory',
        imageUrls: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format'],
        sellerWhatsapp: '08030430681',
        status: 'available',
        createdAt: now,
      },
    ]);

    // Connections profiles
    await db.add('connections', [
      {
        name: 'Chinedu',
        ageBracket: '25-30',
        gender: 'Male',
        state: 'Ebonyi',
        lookingFor: 'Female',
        lookingForAge: '20-25',
        preferredLocation: 'Ebonyi',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format',
        whatsappNumber: '08030430681',
        bioText: 'Content creator and media lover. Enjoy late-night conversations, good Afrobeats music, and road trips.',
        consentGiven: true,
        status: 'approved',
        createdAt: twoDaysAgo,
      },
    ]);

    // Recruitment / Jobs
    await db.add('job_postings', [
      {
        title: 'Video Editor & Motion Designer',
        companyName: 'VCM Studios Nigeria',
        description: 'We are seeking an ambitious video editor skilled with Premiere Pro, CapCut, or After Effects to join our fast-paced media team.',
        requirements: ['Proficient in fast-paced short-form video editing', 'Understanding of social media pacing & viral hooks', 'Ability to meet tight publication deadlines'],
        applyMethod: 'whatsapp',
        applyContact: '2348030430681',
        flyerImageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format',
        status: 'published',
        createdAt: yesterday,
      },
    ]);

    // Subscription plans
    await db.add('subscription_plans', [
      { id: 'monthly', name: 'VCM Monthly VIP', durationDays: 30, price: 1500 },
      { id: 'quarterly', name: 'VCM 90 Days Street Pass', durationDays: 90, price: 3500 },
    ]);

    console.log('VCM database successfully seeded with initial community records.');
  } catch (err) {
    console.warn('Seeding warning:', err);
  }
}
