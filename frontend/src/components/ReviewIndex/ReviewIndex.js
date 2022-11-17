import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import { Switch, NavLink, Link, Route, useParams } from 'react-router-dom';
import { getSpotReviews } from '../../store/reviews';
import './ReviewIndex.css';

const ReviewIndex = ({ spot }) => {
  const dispatch = useDispatch();

  let reviews = useSelector(state => Object.values(state.reviews));
  reviews = reviews.filter((review) => review.spotId === spot.id);

  for (let review of reviews) {
    review.createdAt = new Date(review.createdAt).toLocaleDateString();
  }

  useEffect(() => {
    dispatch(getSpotReviews(spot.id));
  }, [dispatch, spot.id]);

  if (!reviews) return null;

  return (
    <div className='reviews-section'>
      <div className='reviews-header'>
        <h2 className="reviews-title"><i class="fa-solid fa-star"></i> {spot.avgStarRating} · {spot.numReviews} {spot.numReviews === 1 ? 'review' : 'reviews'}</h2>
        <NavLink to={`${spot.id}/create_review`}><button className='add-review'>Add a Review</button></NavLink>
      </div>
      <div className='reviews-div'>
        {reviews.map((review) => (
          <div className='review-text'>
            <span className='reviewer'>{review.User.firstName}</span><br />
            <span className='review-date'>{review.createdAt}</span>
            <p>{review.review}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReviewIndex;
