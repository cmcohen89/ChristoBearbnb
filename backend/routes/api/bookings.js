const express = require('express')

const Sequelize = require('sequelize');
const { Spot, User, SpotImage, Review, ReviewImage, Booking } = require('../../db/models');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const { setTokenCookie, restoreUser } = require('../../utils/auth');
const { validationResult } = require('express-validator');

const router = express.Router();

// Get all of the Current User's Bookings
router.get(
  '/current',
  async (req, res, next) => {
    const { user } = req;
    if (!user) return res.status(401).json({ message: 'Authentication required', statusCode: 401 });

    const userBookings = await Booking.findAll({
      where: {
        userId: user.id
      },
      include: [
        {
          model: Spot,
          attributes: ['id', 'ownerId', 'address', 'city', 'state', 'country', 'lat', 'lng', 'name', 'price'],
          include: [
            {
              model: SpotImage,
              where: {
                preview: true
              },
              attributes: ['url']
            }
          ]
        }
      ]
    })

    const result = [];

    for (let booking of userBookings) {
      booking = booking.toJSON();

      booking.Spot.previewImage = booking.Spot.SpotImages[0].url;
      delete booking.Spot.SpotImages;

      result.push(booking);
    }

    res.json({ 'Bookings': result })
  }
)

// Edit a Booking
router.put(
  '/:bookingId',
  async (req, res, next) => {
    const { user } = req;
    if (!user) return res.status(401).json({ message: 'Authentication required', statusCode: 401 });

    const booking = await Booking.findByPk(req.params.bookingId)
    if (!booking) return res.status(404).json({ message: "Booking couldn't be found", statusCode: 404 });

    if (booking.userId != user.id) return res.status(403).json({ message: "Forbidden", statusCode: 403 });

    const { startDate, endDate } = req.body;
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (endDateObj < startDateObj) {
      return res.status(400).json({
        message: 'Validation error',
        statusCode: 400,
        errors: {
          endDate: 'endDate cannot come before startDate'
        }
      })
    }

    const today = Date.now();
    if (endDateObj < today) {
      return res.status(403).json({ message: "Past bookings can't be modified", statusCode: 403 })
    }

    const spot = await Spot.findOne({
      where: {
        id: booking.spotId
      }
    })

    const currentBookingDates = await Booking.findAll({
      where: {
        spotId: spot.id
      },
      attributes: ['startDate', 'endDate'],
      raw: true
    })

    const errors = {};
    for (let obj of currentBookingDates) {
      currentStartDate = new Date(obj.startDate);
      currentEndDate = new Date(obj.endDate);

      if (startDateObj >= currentStartDate && startDateObj <= currentEndDate) errors.startDate = "Start date conflicts with an existing booking";
      if (endDateObj >= currentStartDate && endDateObj <= currentEndDate) errors.endDate = "End date conflicts with an existing booking";
      if (startDateObj < currentStartDate && endDateObj > currentEndDate) errors.bookingConflict = "Chosen dates conflict with an existing booking";
    }

    if (Object.keys(errors).length) {
      return res.status(403).json({
        message: "Sorry, this spot is already booked for the specified dates",
        statusCode: 403,
        errors
      })
    }

    booking.set({
      startDate,
      endDate
    })

    await booking.save()

    res.json(booking)
  }
)

router.delete(
  '/:bookingId',
  async (req, res, next) => {
    const { user } = req;
    if (!user) return res.status(401).json({ message: 'Authentication required', statusCode: 401 });

    const booking = await Booking.findByPk(req.params.bookingId)
    if (!booking) return res.status(404).json({ message: "Booking couldn't be found", statusCode: 404 })

    const spot = await Spot.findByPk(booking.spotId)
    if (booking.userId != user.id && spot.ownerId != user.id) return res.status(403).json({ message: "Forbidden", statusCode: 403 });

    const today = Date.now()
    const startDateObj = new Date(booking.startDate);
    if (startDateObj < today) {
      res.status(403).json({
        message: "Bookings that have been started can't be deleted",
        statusCode: 403
      })
    }

    await booking.destroy()

    return res.json({ message: "Successfully deleted", statusCode: 200 })
  }
)


module.exports = router;
