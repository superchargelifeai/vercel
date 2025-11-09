const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      const subscriptionCreated = event.data.object;
      await handleSubscriptionCreated(subscriptionCreated);
      break;
    case 'invoice.payment_succeeded':
      const paymentSucceeded = event.data.object;
      await handlePaymentSucceeded(paymentSucceeded);
      break;
    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      await handleSubscriptionDeleted(subscriptionDeleted);
      break;
    case 'invoice.payment_failed':
      const paymentFailed = event.data.object;
      await handlePaymentFailed(paymentFailed);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

async function handleSubscriptionCreated(subscription) {
  try {
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const airtableUserId = customer.metadata.airtable_user_id;

    if (airtableUserId) {
      await base(process.env.AIRTABLE_TABLE_NAME).update(airtableUserId, {
        'Subscription ID': subscription.id,
        'Subscription Status': subscription.status,
        'Customer ID': customerId
      });
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const airtableUserId = customer.metadata.airtable_user_id;

    if (airtableUserId) {
      await base(process.env.AIRTABLE_TABLE_NAME).update(airtableUserId, {
        'Subscription Status': 'active',
        'Latest Invoice': invoice.id,
        'Payment Status': 'paid'
      });
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const airtableUserId = customer.metadata.airtable_user_id;

    if (airtableUserId) {
      await base(process.env.AIRTABLE_TABLE_NAME).update(airtableUserId, {
        'Subscription Status': 'canceled',
        'Canceled At': new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const airtableUserId = customer.metadata.airtable_user_id;

    if (airtableUserId) {
      await base(process.env.AIRTABLE_TABLE_NAME).update(airtableUserId, {
        'Subscription Status': 'past_due',
        'Payment Status': 'failed'
      });
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}