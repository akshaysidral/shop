package com.example.shop.model;

/** Fixed catalogue of permissions. Roles are just named sets of these. */
public enum Permission {
  // access control
  ROLES_READ, 
  ROLES_CREATE, 
  ROLES_UPDATE, 
  ROLES_DELETE,
  USERS_READ, 
  USERS_UPDATE, 
  USERS_DELETE,
  STATS_READ,
  COMMISSION_MANAGE, // set each seller's commission rate (admin)
  // catalogue
  CATEGORIES_MANAGE,
  PRODUCTS_CREATE, 
  PRODUCTS_UPDATE, 
  PRODUCTS_DELETE, // act on the caller's OWN products (sellers)
  PRODUCTS_MANAGE_ALL, // ...or on anybody's products (admin)
  // festival sales and offers
  OFFERS_MANAGE, // own offers (sellers)
  OFFERS_MANAGE_ALL, // any offer (admin)
  // fulfilment
  SELLER_ORDERS_READ, 
  SELLER_ORDERS_UPDATE, // items the caller sells
  ORDERS_READ_ALL, 
  ORDERS_UPDATE, 
  ORDERS_DELETE // all orders (admin)
}
