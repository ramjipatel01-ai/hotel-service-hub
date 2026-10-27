import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  User,
  Department,
  Service,
  Room,
  Request,
  RequestHistory,
  Feedback,
  Notification,
} from '../src/models/index.js';
import {
  USER_ROLES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  SERVICE_CATEGORIES,
  ROOM_STATUS,
  ROOM_TYPE,
  HISTORY_ACTION,
  NOTIFICATION_TYPE,
} from '../src/config/constants.js';

// Load environment variables
dotenv.config();

/**
 * Seed Database with Initial Taxonomy, Rooms, Demo Users, and Logically Consistent Sample Requests
 */
async function seedDatabase() {
  console.log('====================================================');
  console.log('     HOTEL SERVICE HUB — Development Seeder         ');
  console.log('====================================================');

  // Safety check 1: Prevent accidental seeding of production
  if (process.env.NODE_ENV === 'production') {
    console.error('\x1b[31m%s\x1b[0m', '[Seeder Aborted] Seeder cannot run in production environment.');
    process.exit(1);
  }

  // Safety check 2: Require explicit --force flag or ALLOW_SEED_PURGE=true to purge data
  const hasForceFlag = process.argv.includes('--force');
  const allowPurge = process.env.ALLOW_SEED_PURGE === 'true';

  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('YOUR_DB_PASSWORD')) {
    console.warn('\x1b[33m%s\x1b[0m', '[Seeder Standby] MONGODB_URI is unconfigured or contains placeholder "YOUR_DB_PASSWORD".');
    console.warn('\x1b[33m%s\x1b[0m', '[Seeder Standby] Please provide your actual MongoDB Atlas password in server/.env to execute the database seed.');
    console.log('[Seeder Standby] Schema compilation and code structure validated successfully.');
    return;
  }

  if (!hasForceFlag && !allowPurge) {
    console.warn('\x1b[33m%s\x1b[0m', '====================================================================');
    console.warn('\x1b[33m%s\x1b[0m', '[Seeder Guard] DESTRUCTIVE PURGE GUARD ACTIVE');
    console.warn('\x1b[33m%s\x1b[0m', 'Seeding wipes all User, Department, Service, Room, Request, and Audit data.');
    console.warn('\x1b[33m%s\x1b[0m', 'To execute a full re-seed, run with the --force flag or set ALLOW_SEED_PURGE=true:');
    console.warn('\x1b[36m%s\x1b[0m', '   node scripts/seed.js --force');
    console.warn('\x1b[33m%s\x1b[0m', '====================================================================');
    process.exit(0);
  }

  try {
    console.log('[Seeder] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('\x1b[32m%s\x1b[0m', '[Seeder] Connected successfully.');

    console.log('[Seeder] Purging existing development collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Service.deleteMany({}),
      Room.deleteMany({}),
      Request.deleteMany({}),
      RequestHistory.deleteMany({}),
      Feedback.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[Seeder] Existing records cleared.');

    // ------------------------------------------------------------------
    // 1. SEED DEPARTMENTS
    // ------------------------------------------------------------------
    console.log('[Seeder] Seeding 5 core hotel departments...');
    const departmentsData = [
      {
        name: 'Housekeeping',
        code: 'HOUSEKEEPING',
        description: 'Room cleaning, linens, toiletries, and ambient hospitality upkeep.',
        icon: 'Sparkles',
        isActive: true,
      },
      {
        name: 'Maintenance',
        code: 'MAINTENANCE',
        description: 'Electrical, HVAC, plumbing, Wi-Fi, and in-room fixtures maintenance.',
        icon: 'Wrench',
        isActive: true,
      },
      {
        name: 'Room Service',
        code: 'ROOM_SERVICE',
        description: 'Culinary, in-room dining, beverages, and dietary service.',
        icon: 'UtensilsCrossed',
        isActive: true,
      },
      {
        name: 'Transportation',
        code: 'TRANSPORTATION',
        description: 'Airport shuttles, private taxi dispatch, and local travel.',
        icon: 'Car',
        isActive: true,
      },
      {
        name: 'Front Desk',
        code: 'FRONT_DESK',
        description: 'Concierge, room changes, keys, and arrival/departure coordination.',
        icon: 'ConciergeBell',
        isActive: true,
      },
    ];

    const createdDepartments = await Department.insertMany(departmentsData);
    const deptMap = {};
    createdDepartments.forEach((d) => {
      deptMap[d.code] = d;
    });

    // ------------------------------------------------------------------
    // 2. SEED SERVICE CATALOG
    // ------------------------------------------------------------------
    console.log('[Seeder] Seeding complete service catalog taxonomy...');
    const servicesData = [
      // Housekeeping
      {
        name: 'Extra Towels',
        code: 'HK_TOWELS',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Fresh bath and hand towels delivered to your room.',
        icon: 'Bath',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 15,
        allowQuantity: true,
        maxQuantity: 6,
      },
      {
        name: 'Extra Pillow',
        code: 'HK_PILLOW',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Comfortable hypoallergenic extra pillows.',
        icon: 'Moon',
        defaultPriority: REQUEST_PRIORITY.LOW,
        estimatedDurationMinutes: 15,
        allowQuantity: true,
        maxQuantity: 4,
      },
      {
        name: 'Warm Blanket',
        code: 'HK_BLANKET',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Plush warm duvet and additional fleece blankets.',
        icon: 'Bed',
        defaultPriority: REQUEST_PRIORITY.LOW,
        estimatedDurationMinutes: 15,
        allowQuantity: true,
        maxQuantity: 2,
      },
      {
        name: 'Bedsheet Change',
        code: 'HK_BEDSHEET',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Complete change of bed linens and pillowcases.',
        icon: 'Layers',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 25,
      },
      {
        name: 'Full Room Cleaning',
        code: 'HK_CLEANING',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Thorough dusting, vacuuming, and bathroom sanitization.',
        icon: 'Sparkles',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 45,
      },
      {
        name: 'Toiletries Replenishment',
        code: 'HK_TOILETRIES',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Shampoo, conditioner, lotion, dental kit, and soap refills.',
        icon: 'Package',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 15,
      },
      {
        name: 'Bottled Mineral Water',
        code: 'HK_WATER',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: deptMap.HOUSEKEEPING._id,
        description: 'Complimentary premium bottled spring water.',
        icon: 'Droplet',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 10,
        allowQuantity: true,
        maxQuantity: 8,
      },

      // Maintenance
      {
        name: 'AC Temperature & Cooling Issue',
        code: 'MAINT_AC',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Air conditioning not cooling, making noise, or remote malfunction.',
        icon: 'Wind',
        defaultPriority: REQUEST_PRIORITY.URGENT,
        estimatedDurationMinutes: 30,
      },
      {
        name: 'TV & Entertainment Issue',
        code: 'MAINT_TV',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Television display, cable channels, or remote control issues.',
        icon: 'Tv',
        defaultPriority: REQUEST_PRIORITY.HIGH,
        estimatedDurationMinutes: 20,
      },
      {
        name: 'High-Speed Wi-Fi Issue',
        code: 'MAINT_WIFI',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Wi-Fi connection dropouts, authentication, or speed problems.',
        icon: 'Wifi',
        defaultPriority: REQUEST_PRIORITY.HIGH,
        estimatedDurationMinutes: 20,
      },
      {
        name: 'Electrical Outlet & Power Failure',
        code: 'MAINT_ELECTRICITY',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Dead power sockets, light switch defects, or trip switch failure.',
        icon: 'Zap',
        defaultPriority: REQUEST_PRIORITY.URGENT,
        estimatedDurationMinutes: 25,
      },
      {
        name: 'Plumbing & Water Leakage',
        code: 'MAINT_PLUMBING',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Clogged sink, leaking faucet, or low shower pressure.',
        icon: 'Wrench',
        defaultPriority: REQUEST_PRIORITY.URGENT,
        estimatedDurationMinutes: 35,
      },
      {
        name: 'Bathroom Fixture Defect',
        code: 'MAINT_BATHROOM',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Showerhead, toilet flush, or hot water supply issues.',
        icon: 'ShieldAlert',
        defaultPriority: REQUEST_PRIORITY.HIGH,
        estimatedDurationMinutes: 30,
      },
      {
        name: 'Furniture & Lock Defect',
        code: 'MAINT_FURNITURE',
        category: SERVICE_CATEGORIES.MAINTENANCE,
        department: deptMap.MAINTENANCE._id,
        description: 'Wardrobe door hinges, study chair, or window lock defect.',
        icon: 'Hammer',
        defaultPriority: REQUEST_PRIORITY.LOW,
        estimatedDurationMinutes: 30,
      },

      // Room Service (Dining)
      {
        name: 'In-Room Gourmet Meal',
        code: 'RS_FOOD',
        category: SERVICE_CATEGORIES.ROOM_SERVICE,
        department: deptMap.ROOM_SERVICE._id,
        description: 'Chef-crafted appetizers, mains, and desserts from restaurant menu.',
        icon: 'Utensils',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 40,
        price: 750,
      },
      {
        name: 'Artisan Beverage & Wine',
        code: 'RS_BEVERAGE',
        category: SERVICE_CATEGORIES.ROOM_SERVICE,
        department: deptMap.ROOM_SERVICE._id,
        description: 'Fresh juices, espresso, tea, cocktails, and wine selection.',
        icon: 'Coffee',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 20,
        allowQuantity: true,
        maxQuantity: 6,
        price: 350,
      },
      {
        name: 'Continental Breakfast Package',
        code: 'RS_BREAKFAST',
        category: SERVICE_CATEGORIES.ROOM_SERVICE,
        department: deptMap.ROOM_SERVICE._id,
        description: 'Croissants, fruit basket, omelettes, and brewed coffee.',
        icon: 'Sun',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 30,
        price: 650,
      },
      {
        name: 'Signature Dinner Platter',
        code: 'RS_DINNER',
        category: SERVICE_CATEGORIES.ROOM_SERVICE,
        department: deptMap.ROOM_SERVICE._id,
        description: 'Multi-course luxury dining experience delivered to your suite.',
        icon: 'Wine',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 45,
        price: 1499,
      },
      {
        name: 'Special Dietary & Allergy Preparation',
        code: 'RS_SPECIAL_MEAL',
        category: SERVICE_CATEGORIES.ROOM_SERVICE,
        department: deptMap.ROOM_SERVICE._id,
        description: 'Gluten-free, vegan, nut-free, or specific dietary meal request.',
        icon: 'HeartHandshake',
        defaultPriority: REQUEST_PRIORITY.HIGH,
        estimatedDurationMinutes: 45,
        price: 850,
      },

      // Transportation
      {
        name: 'Airport Chauffeur Pickup',
        code: 'TRANS_PICKUP',
        category: SERVICE_CATEGORIES.TRANSPORTATION,
        department: deptMap.TRANSPORTATION._id,
        description: 'Executive sedan airport pickup with flight delay monitoring.',
        icon: 'PlaneLanding',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 60,
        price: 1800,
      },
      {
        name: 'Airport Drop-off Shuttle',
        code: 'TRANS_DROP',
        category: SERVICE_CATEGORIES.TRANSPORTATION,
        department: deptMap.TRANSPORTATION._id,
        description: 'Timely transfer directly to your departure flight terminal.',
        icon: 'PlaneTakeoff',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 45,
        price: 1500,
      },
      {
        name: 'On-Demand Private Taxi',
        code: 'TRANS_TAXI',
        category: SERVICE_CATEGORIES.TRANSPORTATION,
        department: deptMap.TRANSPORTATION._id,
        description: 'Quick taxi hailing for city exploration and business visits.',
        icon: 'Car',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 15,
        price: 600,
      },
      {
        name: 'Local City Tour Shuttle',
        code: 'TRANS_LOCAL',
        category: SERVICE_CATEGORIES.TRANSPORTATION,
        department: deptMap.TRANSPORTATION._id,
        description: 'Guided city landmarks and cultural attractions shuttle.',
        icon: 'Compass',
        defaultPriority: REQUEST_PRIORITY.LOW,
        estimatedDurationMinutes: 120,
        price: 1200,
      },
      {
        name: 'Premium Rental Car Coordination',
        code: 'TRANS_RENTAL',
        category: SERVICE_CATEGORIES.TRANSPORTATION,
        department: deptMap.TRANSPORTATION._id,
        description: 'Daily luxury rental car delivered to hotel concierge valet.',
        icon: 'Key',
        defaultPriority: REQUEST_PRIORITY.LOW,
        estimatedDurationMinutes: 90,
        price: 3500,
      },

      // Front Desk
      {
        name: 'Room Change Request',
        code: 'FD_ROOM_CHANGE',
        category: SERVICE_CATEGORIES.FRONT_DESK,
        department: deptMap.FRONT_DESK._id,
        description: 'Request a floor change, quieter room, or view upgrade.',
        icon: 'Repeat',
        defaultPriority: REQUEST_PRIORITY.HIGH,
        estimatedDurationMinutes: 30,
      },
      {
        name: 'Extra Key Card Replacement',
        code: 'FD_KEY',
        category: SERVICE_CATEGORIES.FRONT_DESK,
        department: deptMap.FRONT_DESK._id,
        description: 'Duplicate RFID keycard programmed and delivered to room.',
        icon: 'CreditCard',
        defaultPriority: REQUEST_PRIORITY.HIGH,
        estimatedDurationMinutes: 15,
        allowQuantity: true,
        maxQuantity: 3,
      },
      {
        name: 'Early Check-In Assistance',
        code: 'FD_CHECKIN',
        category: SERVICE_CATEGORIES.FRONT_DESK,
        department: deptMap.FRONT_DESK._id,
        description: 'Priority room prep and baggage staging for early arrivals.',
        icon: 'Clock',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 30,
      },
      {
        name: 'Express Check-Out & Baggage Help',
        code: 'FD_CHECKOUT',
        category: SERVICE_CATEGORIES.FRONT_DESK,
        department: deptMap.FRONT_DESK._id,
        description: 'Bellboy luggage pickup and invoice settlement in room.',
        icon: 'Briefcase',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 20,
      },
      {
        name: 'General Concierge Inquiry',
        code: 'FD_ASSISTANCE',
        category: SERVICE_CATEGORIES.FRONT_DESK,
        department: deptMap.FRONT_DESK._id,
        description: 'Restaurant reservations, city guidance, and personal assistance.',
        icon: 'HelpCircle',
        defaultPriority: REQUEST_PRIORITY.LOW,
        estimatedDurationMinutes: 20,
      },
    ];

    const createdServices = await Service.insertMany(servicesData);
    const serviceMap = {};
    createdServices.forEach((s) => {
      serviceMap[s.code] = s;
    });

    // ------------------------------------------------------------------
    // 3. SEED ROOMS
    // ------------------------------------------------------------------
    console.log('[Seeder] Seeding 15 realistic guest rooms across 3 floors...');
    const roomsData = [
      // Floor 1
      { roomNumber: '101', floor: 1, roomType: ROOM_TYPE.STANDARD, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '102', floor: 1, roomType: ROOM_TYPE.STANDARD, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '103', floor: 1, roomType: ROOM_TYPE.DELUXE, status: ROOM_STATUS.OCCUPIED },
      { roomNumber: '104', floor: 1, roomType: ROOM_TYPE.DELUXE, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '105', floor: 1, roomType: ROOM_TYPE.SUITE, status: ROOM_STATUS.MAINTENANCE },

      // Floor 2
      { roomNumber: '201', floor: 2, roomType: ROOM_TYPE.DELUXE, status: ROOM_STATUS.OCCUPIED }, // Demo guest room
      { roomNumber: '202', floor: 2, roomType: ROOM_TYPE.STANDARD, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '203', floor: 2, roomType: ROOM_TYPE.STANDARD, status: ROOM_STATUS.OCCUPIED },
      { roomNumber: '204', floor: 2, roomType: ROOM_TYPE.DELUXE, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '205', floor: 2, roomType: ROOM_TYPE.EXECUTIVE_SUITE, status: ROOM_STATUS.AVAILABLE },

      // Floor 3
      { roomNumber: '301', floor: 3, roomType: ROOM_TYPE.DELUXE, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '302', floor: 3, roomType: ROOM_TYPE.DELUXE, status: ROOM_STATUS.OCCUPIED },
      { roomNumber: '303', floor: 3, roomType: ROOM_TYPE.EXECUTIVE_SUITE, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '304', floor: 3, roomType: ROOM_TYPE.SUITE, status: ROOM_STATUS.AVAILABLE },
      { roomNumber: '305', floor: 3, roomType: ROOM_TYPE.PRESIDENTIAL_SUITE, status: ROOM_STATUS.OCCUPIED },
    ];

    const createdRooms = await Room.insertMany(roomsData);
    const roomMap = {};
    createdRooms.forEach((r) => {
      roomMap[r.roomNumber] = r;
    });

    // ------------------------------------------------------------------
    // 4. SEED DEMO USERS (Bcrypt Hashed Passwords)
    // ------------------------------------------------------------------
    console.log('[Seeder] Creating authenticated demo users with bcrypt hashing...');
    const saltRounds = 10;
    const guestPasswordHash = await bcrypt.hash('guest123', saltRounds);
    const staffPasswordHash = await bcrypt.hash('staff123', saltRounds);
    const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
    const managerPasswordHash = await bcrypt.hash('manager123', saltRounds);

    const usersData = [
      // 1 Guest
      {
        name: 'Priya Sharma',
        email: 'guest@hotelhub.com',
        phone: '+91 98765 43210',
        password: guestPasswordHash,
        role: USER_ROLES.GUEST,
        room: roomMap['201']._id,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      // 1 Staff per Department
      {
        name: 'Rajesh Kumar (Housekeeping)',
        email: 'staff.hk@hotelhub.com',
        phone: '+91 98111 22334',
        password: staffPasswordHash,
        role: USER_ROLES.STAFF,
        department: deptMap.HOUSEKEEPING._id,
        isOnDuty: true,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      {
        name: 'Vikram Patel (Maintenance)',
        email: 'staff.maint@hotelhub.com',
        phone: '+91 98222 33445',
        password: staffPasswordHash,
        role: USER_ROLES.STAFF,
        department: deptMap.MAINTENANCE._id,
        isOnDuty: true,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
      {
        name: 'Neha Singh (Dining)',
        email: 'staff.dining@hotelhub.com',
        phone: '+91 98333 44556',
        password: staffPasswordHash,
        role: USER_ROLES.STAFF,
        department: deptMap.ROOM_SERVICE._id,
        isOnDuty: true,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      {
        name: 'Amit Verma (Transport)',
        email: 'staff.trans@hotelhub.com',
        phone: '+91 98444 55667',
        password: staffPasswordHash,
        role: USER_ROLES.STAFF,
        department: deptMap.TRANSPORTATION._id,
        isOnDuty: true,
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      },
      {
        name: 'Aisha Al-Mansoor (Front Desk)',
        email: 'staff.front@hotelhub.com',
        phone: '+91 98555 66778',
        password: staffPasswordHash,
        role: USER_ROLES.STAFF,
        department: deptMap.FRONT_DESK._id,
        isOnDuty: true,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      },
      // 1 Admin
      {
        name: 'Arjun Malhotra (System Admin)',
        email: 'admin@hotelhub.com',
        phone: '+91 98000 11223',
        password: adminPasswordHash,
        role: USER_ROLES.ADMIN,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      },
      // 1 Manager
      {
        name: 'Sunita Rao (General Manager)',
        email: 'manager@hotelhub.com',
        phone: '+91 98999 00112',
        password: managerPasswordHash,
        role: USER_ROLES.MANAGER,
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      },
    ];

    const createdUsers = await User.insertMany(usersData);
    const userMap = {};
    createdUsers.forEach((u) => {
      userMap[u.email] = u;
    });

    // Link demo guest to Room 201
    await Room.findByIdAndUpdate(roomMap['201']._id, {
      currentGuest: userMap['guest@hotelhub.com']._id,
      status: ROOM_STATUS.OCCUPIED,
    });

    // ------------------------------------------------------------------
    // 5. SEED SAMPLE REQUESTS & LOGICAL AUDIT HISTORIES
    // ------------------------------------------------------------------
    console.log('[Seeder] Creating realistic sample requests with lifecycle histories...');

    const guestId = userMap['guest@hotelhub.com']._id;
    const room201Id = roomMap['201']._id;
    const now = Date.now();

    // Request 1: PENDING (Extra Towels)
    const req1 = await Request.create({
      requestNumber: 'REQ-20261008-0001',
      guest: guestId,
      room: room201Id,
      department: deptMap.HOUSEKEEPING._id,
      service: serviceMap.HK_TOWELS._id,
      serviceTitle: serviceMap.HK_TOWELS.name,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.PENDING,
      quantity: 2,
      description: 'Please bring 2 additional fresh bath towels.',
      createdAt: new Date(now - 15 * 60 * 1000), // 15 mins ago
    });

    await RequestHistory.create({
      request: req1._id,
      performedBy: guestId,
      previousStatus: null,
      newStatus: REQUEST_STATUS.PENDING,
      action: HISTORY_ACTION.CREATED,
      notes: 'Request submitted by guest.',
      timestamp: req1.createdAt,
    });

    // Request 2: ASSIGNED (Airport Drop-off)
    const req2 = await Request.create({
      requestNumber: 'REQ-20261008-0002',
      guest: guestId,
      room: room201Id,
      department: deptMap.TRANSPORTATION._id,
      service: serviceMap.TRANS_DROP._id,
      serviceTitle: serviceMap.TRANS_DROP.name,
      category: SERVICE_CATEGORIES.TRANSPORTATION,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.ASSIGNED,
      assignedStaff: userMap['staff.trans@hotelhub.com']._id,
      description: 'Transfer needed tomorrow morning to Terminal 2 at 8:00 AM.',
      preferredTime: new Date(now + 12 * 60 * 60 * 1000),
      createdAt: new Date(now - 45 * 60 * 1000),
      assignedAt: new Date(now - 30 * 60 * 1000),
    });

    await RequestHistory.insertMany([
      {
        request: req2._id,
        performedBy: guestId,
        previousStatus: null,
        newStatus: REQUEST_STATUS.PENDING,
        action: HISTORY_ACTION.CREATED,
        notes: 'Flight departure transfer booking.',
        timestamp: req2.createdAt,
      },
      {
        request: req2._id,
        performedBy: userMap['admin@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.ASSIGNED,
        action: HISTORY_ACTION.ASSIGNED,
        notes: 'Assigned to driver Marcus Chen.',
        timestamp: req2.assignedAt,
      },
    ]);

    // Request 3: IN_PROGRESS (AC Cooling Issue)
    const req3 = await Request.create({
      requestNumber: 'REQ-20261008-0003',
      guest: guestId,
      room: room201Id,
      department: deptMap.MAINTENANCE._id,
      service: serviceMap.MAINT_AC._id,
      serviceTitle: serviceMap.MAINT_AC.name,
      category: SERVICE_CATEGORIES.MAINTENANCE,
      priority: REQUEST_PRIORITY.URGENT,
      status: REQUEST_STATUS.IN_PROGRESS,
      assignedStaff: userMap['staff.maint@hotelhub.com']._id,
      description: 'AC unit making humming sound and not dropping below 26C.',
      createdAt: new Date(now - 60 * 60 * 1000),
      assignedAt: new Date(now - 50 * 60 * 1000),
      acceptedAt: new Date(now - 40 * 60 * 1000),
      startedAt: new Date(now - 20 * 60 * 1000),
    });

    await RequestHistory.insertMany([
      {
        request: req3._id,
        performedBy: guestId,
        previousStatus: null,
        newStatus: REQUEST_STATUS.PENDING,
        action: HISTORY_ACTION.CREATED,
        notes: 'Urgent cooling breakdown reported.',
        timestamp: req3.createdAt,
      },
      {
        request: req3._id,
        performedBy: userMap['admin@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.ASSIGNED,
        action: HISTORY_ACTION.ASSIGNED,
        notes: 'Dispatched to technician Vikram Patel.',
        timestamp: req3.assignedAt,
      },
      {
        request: req3._id,
        performedBy: userMap['staff.maint@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.ASSIGNED,
        newStatus: REQUEST_STATUS.ACCEPTED,
        action: HISTORY_ACTION.ACCEPTED,
        notes: 'Technician on way with diagnostic equipment.',
        timestamp: req3.acceptedAt,
      },
      {
        request: req3._id,
        performedBy: userMap['staff.maint@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.ACCEPTED,
        newStatus: REQUEST_STATUS.IN_PROGRESS,
        action: HISTORY_ACTION.STARTED,
        notes: 'Inspecting thermostat calibration and refrigerant valve.',
        timestamp: req3.startedAt,
      },
    ]);

    // Request 4: COMPLETED (Room Cleaning) - Awaiting confirmation
    const req4 = await Request.create({
      requestNumber: 'REQ-20261008-0004',
      guest: guestId,
      room: room201Id,
      department: deptMap.HOUSEKEEPING._id,
      service: serviceMap.HK_CLEANING._id,
      serviceTitle: serviceMap.HK_CLEANING.name,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.COMPLETED,
      assignedStaff: userMap['staff.hk@hotelhub.com']._id,
      description: 'Midday full service cleaning while guest is at lunch.',
      createdAt: new Date(now - 120 * 60 * 1000),
      assignedAt: new Date(now - 110 * 60 * 1000),
      acceptedAt: new Date(now - 100 * 60 * 1000),
      startedAt: new Date(now - 80 * 60 * 1000),
      completedAt: new Date(now - 25 * 60 * 1000),
    });

    await RequestHistory.insertMany([
      {
        request: req4._id,
        performedBy: guestId,
        previousStatus: null,
        newStatus: REQUEST_STATUS.PENDING,
        action: HISTORY_ACTION.CREATED,
        notes: 'Room turnaround request.',
        timestamp: req4.createdAt,
      },
      {
        request: req4._id,
        performedBy: userMap['admin@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.ASSIGNED,
        action: HISTORY_ACTION.ASSIGNED,
        notes: 'Assigned to Carlos Mendez.',
        timestamp: req4.assignedAt,
      },
      {
        request: req4._id,
        performedBy: userMap['staff.hk@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.ASSIGNED,
        newStatus: REQUEST_STATUS.ACCEPTED,
        action: HISTORY_ACTION.ACCEPTED,
        notes: 'Cleaning supply cart ready.',
        timestamp: req4.acceptedAt,
      },
      {
        request: req4._id,
        performedBy: userMap['staff.hk@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.ACCEPTED,
        newStatus: REQUEST_STATUS.IN_PROGRESS,
        action: HISTORY_ACTION.STARTED,
        notes: 'Turnaround in progress.',
        timestamp: req4.startedAt,
      },
      {
        request: req4._id,
        performedBy: userMap['staff.hk@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.IN_PROGRESS,
        newStatus: REQUEST_STATUS.COMPLETED,
        action: HISTORY_ACTION.COMPLETED,
        notes: 'Linens refreshed, bathroom sanitized, and replenished.',
        timestamp: req4.completedAt,
      },
    ]);

    // Request 5: CONFIRMED (Signature Dinner with Feedback)
    const req5 = await Request.create({
      requestNumber: 'REQ-20261008-0005',
      guest: guestId,
      room: room201Id,
      department: deptMap.ROOM_SERVICE._id,
      service: serviceMap.RS_DINNER._id,
      serviceTitle: serviceMap.RS_DINNER.name,
      category: SERVICE_CATEGORIES.ROOM_SERVICE,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.CONFIRMED,
      assignedStaff: userMap['staff.dining@hotelhub.com']._id,
      quantity: 1,
      description: 'Signature salmon platter with sparkling water.',
      createdAt: new Date(now - 180 * 60 * 1000),
      assignedAt: new Date(now - 170 * 60 * 1000),
      acceptedAt: new Date(now - 160 * 60 * 1000),
      startedAt: new Date(now - 140 * 60 * 1000),
      completedAt: new Date(now - 90 * 60 * 1000),
      confirmedAt: new Date(now - 80 * 60 * 1000),
    });

    await RequestHistory.insertMany([
      {
        request: req5._id,
        performedBy: guestId,
        previousStatus: null,
        newStatus: REQUEST_STATUS.PENDING,
        action: HISTORY_ACTION.CREATED,
        notes: 'In-room dinner order.',
        timestamp: req5.createdAt,
      },
      {
        request: req5._id,
        performedBy: userMap['staff.dining@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.ACCEPTED,
        action: HISTORY_ACTION.ACCEPTED,
        notes: 'Order confirmed with kitchen chef.',
        timestamp: req5.acceptedAt,
      },
      {
        request: req5._id,
        performedBy: userMap['staff.dining@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.ACCEPTED,
        newStatus: REQUEST_STATUS.IN_PROGRESS,
        action: HISTORY_ACTION.STARTED,
        notes: 'Food being prepared and plated.',
        timestamp: req5.startedAt,
      },
      {
        request: req5._id,
        performedBy: userMap['staff.dining@hotelhub.com']._id,
        previousStatus: REQUEST_STATUS.IN_PROGRESS,
        newStatus: REQUEST_STATUS.COMPLETED,
        action: HISTORY_ACTION.COMPLETED,
        notes: 'Tray delivered to suite table.',
        timestamp: req5.completedAt,
      },
      {
        request: req5._id,
        performedBy: guestId,
        previousStatus: REQUEST_STATUS.COMPLETED,
        newStatus: REQUEST_STATUS.CONFIRMED,
        action: HISTORY_ACTION.CONFIRMED,
        notes: 'Guest confirmed prompt delivery.',
        timestamp: req5.confirmedAt,
      },
    ]);

    // Seed 5-star Feedback for confirmed request
    await Feedback.create({
      request: req5._id,
      guest: guestId,
      staff: userMap['staff.dining@hotelhub.com']._id,
      department: deptMap.ROOM_SERVICE._id,
      rating: 5,
      comment: 'Delicious warm dinner, beautifully arranged and arrived 10 minutes early! Outstanding hospitality.',
      createdAt: req5.confirmedAt,
    });

    // Seed initial notifications for demo accounts
    await Notification.insertMany([
      {
        user: guestId,
        request: req4._id,
        title: 'Room Cleaning Completed',
        message: 'Your room cleaning request REQ-20261008-0004 has been completed. Please confirm.',
        type: NOTIFICATION_TYPE.REQUEST_COMPLETED,
        isRead: false,
      },
      {
        user: userMap['staff.maint@hotelhub.com']._id,
        request: req3._id,
        title: 'Urgent Maintenance Assigned',
        message: 'Urgent AC repair REQ-20261008-0003 assigned to your queue.',
        type: NOTIFICATION_TYPE.URGENT_REQUEST,
        isRead: true,
      },
    ]);

    console.log('====================================================');
    console.log('\x1b[32m%s\x1b[0m', '  Database Seeding Completed Successfully!           ');
    console.log('====================================================');
    console.log(`- Departments : ${createdDepartments.length}`);
    console.log(`- Services    : ${createdServices.length}`);
    console.log(`- Rooms       : ${createdRooms.length}`);
    console.log(`- Users       : ${createdUsers.length}`);
    console.log(`- Requests    : 5 sample lifecycle tickets`);
    console.log(`- Audit Trail : 13 immutable history entries`);
    console.log(`- Feedback    : 1 review (5-star rating)`);
    console.log(`- Notification: 2 sample alerts`);
    console.log('----------------------------------------------------');
    console.log('Demo Credentials Summary (Dev-only):');
    console.log('• Guest   : guest@hotelhub.com / guest123');
    console.log('• Staff   : staff.hk@hotelhub.com / staff123');
    console.log('• Staff   : staff.maint@hotelhub.com / staff123');
    console.log('• Staff   : staff.dining@hotelhub.com / staff123');
    console.log('• Staff   : staff.trans@hotelhub.com / staff123');
    console.log('• Staff   : staff.front@hotelhub.com / staff123');
    console.log('• Admin   : admin@hotelhub.com / admin123');
    console.log('• Manager : manager@hotelhub.com / manager123');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `[Seeder Error] Database seeding encountered an error: ${error.message}`);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Execute seed function
seedDatabase();
