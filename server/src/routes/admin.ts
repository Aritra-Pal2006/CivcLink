import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth';
import { getUsers, assignRole, inviteUser } from '../controllers/adminUserController';

const router = Router();

// Protect all admin routes
router.use(verifyToken);

// List Users
router.get('/users', authorize(['superadmin', 'city_admin']), getUsers);

// Assign Role
router.put('/users/:uid/role', authorize(['superadmin', 'city_admin']), assignRole);

// Invite/Create User
router.post('/users/invite', authorize(['superadmin', 'city_admin']), inviteUser);

export default router;
