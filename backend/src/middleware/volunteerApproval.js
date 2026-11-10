function requireApprovedVolunteer(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required.",
        });
    }

    if (req.user.role !== "volunteer") {
        return res.status(403).json({
            message: "Only volunteers can access this resource.",
        });
    }

    const isApproved =
        req.user.isVerified === true ||
        req.user.isVerified === 1;

    if (!isApproved) {
        return res.status(403).json({
            code: "VOLUNTEER_APPROVAL_REQUIRED",
            message: "Your volunteer account is awaiting admin approval. You cannot claim or update pickups until approved.",
        });
    }

    return next();
}

module.exports = { requireApprovedVolunteer };