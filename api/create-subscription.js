const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

module.exports = async (req, res) => {
  // Verify API key
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.GPT_ACTIONS_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { customerId, userId } = req.body;

  if (!customerId || !userId) {
    return res.status(400).json({ error: 'Customer ID and userId are required' });
  }

  try {
    // Check if user already has an active subscription
    const userRecord = await base(process.env.AIRTABLE_TABLE_NAME).find(userId);
    const subscriptionStatus = userRecord.fields['Subscription Status'];
    
    if (subscriptionStatus === 'active') {
      return res.status(200).json({ 
        message: 'User already has an active subscription',
        status: subscriptionStatus
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: process.env.STRIPE_PRICE_ID,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return res.status(201).json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};