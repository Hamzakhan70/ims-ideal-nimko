// routes/assignmentRoutes.js
import express from "express";
import ShopSalesmanAssignment from "../models/ShopSalesmanAssignment.js";
import User from "../models/User.js";
import {authenticateToken} from "../middleware/auth.js";
const router = express.Router();

// Get all assignments (Super Admin only)
router.get("/", authenticateToken, async (req, res) => {
    try { // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied. Super admin required."});
        }

        const {
            page = 1,
            limit = 20,
            search = '',
            salesmanId = '',
            shopkeeperId = ''
        } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        let query = {
            isActive: true
        };

        if (salesmanId) {
            query.salesmanId = salesmanId;
        }

        if (shopkeeperId) {
            query.shopkeeperId = shopkeeperId;
        }

        // If search term provided, we'll filter after populating
        let assignmentsQuery = ShopSalesmanAssignment.find(query).populate('salesmanId', 'name email role').populate('shopkeeperId', 'name email role').populate('assignedBy', 'name email').sort({assignedAt: -1});

        let assignments = await assignmentsQuery;

        // Apply search filter after populating
        if (search) {
            const searchLower = search.toLowerCase();
            assignments = assignments.filter(assignment => {
                const salesmanName = assignment.salesmanId ?. name ?. toLowerCase() || '';
                const salesmanEmail = assignment.salesmanId ?. email ?. toLowerCase() || '';
                const shopkeeperName = assignment.shopkeeperId ?. name ?. toLowerCase() || '';
                const shopkeeperEmail = assignment.shopkeeperId ?. email ?. toLowerCase() || '';
                return salesmanName.includes(searchLower) || salesmanEmail.includes(searchLower) || shopkeeperName.includes(searchLower) || shopkeeperEmail.includes(searchLower);
            });
        }

        const total = assignments.length;

        // Apply pagination after filtering
        const paginatedAssignments = assignments.slice(skip, skip + parseInt(limit));

        res.json({
            assignments: paginatedAssignments,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Get assignments for a specific salesman
router.get("/salesman/:salesmanId", authenticateToken, async (req, res) => {
    try {
        const {salesmanId} = req.params;

        // Check if user is the salesman or super admin
        if (req.user._id.toString() !== salesmanId && req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied."});
        }

        const assignments = await ShopSalesmanAssignment.find({salesmanId, isActive: true}).populate('shopkeeperId', 'name email phone address').populate('assignedBy', 'name email').sort({assignedAt: -1});

        res.json({success: true, assignments});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Get shopkeepers assigned to a salesman
router.get("/salesman/:salesmanId/shopkeepers", authenticateToken, async (req, res) => {
    try {
        const {salesmanId} = req.params;
        const {city} = req.query;

        // Check if user is the salesman or super admin
        if (req.user._id.toString() !== salesmanId && req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied."});
        }

        const assignments = await ShopSalesmanAssignment.find({salesmanId, isActive: true}).populate({
            path: 'shopkeeperId',
            select: 'name email phone address pendingAmount creditLimit city',
            populate: {
                path: 'city',
                select: 'name'
            }
        }).sort({assignedAt: -1});

        let shopkeepers = assignments.map(assignment => assignment.shopkeeperId).filter(shopkeeper => shopkeeper !== null);

        // Filter by city if provided
        if (city) {
            shopkeepers = shopkeepers.filter(shopkeeper => {
                const shopkeeperCityId = shopkeeper.city ?. _id || shopkeeper.city;
                return shopkeeperCityId ?. toString() === city.toString();
            });
        }

        res.json({success: true, shopkeepers});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Create new assignment (Super Admin only)
router.post("/", authenticateToken, async (req, res) => {
    try { // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied. Super admin required."});
        }

        const {salesmanId, shopkeeperId, notes} = req.body;

        // Validate salesman exists and has salesman role
        const salesman = await User.findById(salesmanId);
        if (! salesman || salesman.role !== 'salesman') {
            return res.status(400).json({error: "Invalid salesman ID or role."});
        }

        // Validate shopkeeper exists and has shopkeeper role
        const shopkeeper = await User.findById(shopkeeperId);
        if (! shopkeeper || shopkeeper.role !== 'shopkeeper') {
            return res.status(400).json({error: "Invalid shopkeeper ID or role."});
        }

        // Check if assignment already exists
        const existingAssignment = await ShopSalesmanAssignment.findOne({salesmanId, shopkeeperId, isActive: true});

        if (existingAssignment) {
            return res.status(400).json({error: "Assignment already exists."});
        }

        const assignment = new ShopSalesmanAssignment({salesmanId, shopkeeperId, assignedBy: req.user._id, notes});

        await assignment.save();

        // Populate the response
        await assignment.populate('salesmanId', 'name email role');
        await assignment.populate('shopkeeperId', 'name email role');
        await assignment.populate('assignedBy', 'name email');

        res.status(201).json({success: true, message: "Assignment created successfully", assignment});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});

// Update assignment (Super Admin only)
router.put("/:id", authenticateToken, async (req, res) => {
    try { // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied. Super admin required."});
        }

        const {notes, isActive} = req.body;

        const assignment = await ShopSalesmanAssignment.findByIdAndUpdate(req.params.id, {
            notes,
            isActive
        }, {
            new: true,
            runValidators: true
        }).populate('salesmanId', 'name email role').populate('shopkeeperId', 'name email role').populate('assignedBy', 'name email');

        if (! assignment) {
            return res.status(404).json({error: "Assignment not found."});
        }

        res.json({success: true, message: "Assignment updated successfully", assignment});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});

// Deactivate assignment (Super Admin only)
router.delete("/:id", authenticateToken, async (req, res) => {
    try { // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied. Super admin required."});
        }

        const assignment = await ShopSalesmanAssignment.findByIdAndUpdate(req.params.id, {
            isActive: false
        }, {new: true});

        if (! assignment) {
            return res.status(404).json({error: "Assignment not found."});
        }

        res.json({success: true, message: "Assignment deactivated successfully"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Get available salesmen (for assignment dropdown)
router.get("/available/salesmen", authenticateToken, async (req, res) => {
    try { // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied. Super admin required."});
        }

        const salesmen = await User.find({role: 'salesman'}).select('name email phone').sort({name: 1});

        res.json({success: true, salesmen});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Get available shopkeepers (for assignment dropdown)
router.get("/available/shopkeepers", authenticateToken, async (req, res) => {
    try { // Check if user is super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({error: "Access denied. Super admin required."});
        }

        const shopkeepers = await User.find({role: 'shopkeeper'}).select('name email phone address').sort({name: 1});

        res.json({success: true, shopkeepers});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

export default router;
