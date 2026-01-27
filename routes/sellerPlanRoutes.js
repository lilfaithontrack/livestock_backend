const express = require('express');
const router = express.Router();
const sellerPlanController = require('../controllers/sellerPlanController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
 const upload = require('../middleware/uploadMiddleware');

router.post(
    '/create',
    verifyToken,
    requireRole(['Seller']),
    sellerPlanController.createSellerPlan
);

router.get(
    '/my-plans',
    verifyToken,
    requireRole(['Seller']),
    sellerPlanController.getSellerPlans
);

router.get(
    '/current',
    verifyToken,
    requireRole(['Seller']),
    sellerPlanController.getCurrentPlan
);

router.put(
    '/:plan_id/payment',
    verifyToken,
    requireRole(['Seller']),
    sellerPlanController.updatePlanPayment
);

 router.post(
     '/:plan_id/payment-proof',
     verifyToken,
     requireRole(['Seller']),
     upload.single('payment_proof'),
     sellerPlanController.uploadPlanPaymentProof
 );

router.get(
    '/check-eligibility',
    verifyToken,
    requireRole(['Seller']),
    sellerPlanController.checkPlanEligibility
);

router.put(
    '/:plan_id/deactivate',
    verifyToken,
    requireRole(['Seller']),
    sellerPlanController.deactivatePlan
);

router.get(
    '/all',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.getAllPlans
);

router.put(
    '/:plan_id/approve',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.approvePlan
);

router.put(
    '/:plan_id/reject',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.rejectPlan
);

router.get(
    '/stats',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.getPlanStats
);

router.get(
    '/tiers',
    sellerPlanController.getSubscriptionTiers
);

router.put(
    '/tiers/:tierKey',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.updateSubscriptionTier
);

router.get(
    '/commission',
    sellerPlanController.getCommissionSettings
);

router.put(
    '/commission',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.updateCommissionSettings
);

router.post(
    '/admin/create',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.adminCreatePlan
);

router.get(
    '/:plan_id',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.getPlanById
);

router.put(
    '/admin/:plan_id',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.adminUpdatePlan
);

router.delete(
    '/admin/:plan_id',
    verifyToken,
    requireRole(['Admin']),
    sellerPlanController.adminDeletePlan
);

module.exports = router;
