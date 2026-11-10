const express = require("express");

const {
  createRequest,
  getDonorRequests,
  updateRequestStatus,
  getNgoRequests,
} = require("../controllers/request.controller");

const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorizeRoles("ngo"),
  createRequest
);

router.get(
  "/donor",
  authorizeRoles("donor"),
  getDonorRequests
);

router.get(
  "/ngo",
  authorizeRoles("ngo"),
  getNgoRequests
);

router.patch(
  "/:requestId/status",
  authorizeRoles("donor"),
  updateRequestStatus
);

module.exports = router;