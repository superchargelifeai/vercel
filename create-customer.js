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

  const { email, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ error: 'Email and userId are required' });
  }

  try {
    // Check if user already has a Stripe customer ID
    const userRecord = await base(process.env.AIRTABLE_TABLE_NAME).find(userId);
    const existingCustomerId = userRecord.fields['Customer ID'];

    if (existingCustomerId) {
      // Return existing customer ID
      return res.status(200).json({ 
        customerId: existingCustomerId,
        existing: true
      });
    }

    // Create customer in Stripe
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        airtable_user_id: userId
      }
    });

    // Update Airtable with the new customer ID
    await base(process.env.AIRTABLE_TABLE_NAME).update(userId, {
      'Customer ID': customer.id
    });

    return res.status(201).json({ 
      customerId: customer.id,
      existing: false
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};