/**
 * Cart Utilities - Client-side AJAX operations for shopping cart
 * Provides dynamic cart management without page reloads
 */

// Add item to cart via AJAX
function addToCartAJAX(productId, quantity = 1) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                   document.querySelector('input[name="_csrf"]')?.value;

  fetch('/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ product_id: productId, quantity })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('success', 'Item added to cart!');
      updateCartCount(data.itemCount);
    } else {
      showNotification('error', data.message || 'Failed to add item to cart');
    }
  })
  .catch(error => {
    console.error('Cart error:', error);
    showNotification('error', 'An error occurred while adding to cart');
  });
}

// Update cart item quantity via AJAX
function updateCartItemAJAX(productId, quantity) {
  const csrfToken = document.querySelector('input[name="_csrf"]')?.value;

  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    removeFromCartAJAX(productId);
    return;
  }

  fetch(`/cart/${productId}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ quantity })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update the item row in the table
      const itemRow = document.querySelector(`[data-product-id="${productId}"]`);
      if (itemRow) {
        const pricePerItem = parseFloat(itemRow.dataset.price);
        const subtotal = pricePerItem * quantity;
        const subtotalCell = itemRow.querySelector('.item-subtotal');
        if (subtotalCell) {
          subtotalCell.textContent = '$' + subtotal.toFixed(2);
        }
      }
      updateCartSummary();
      showNotification('success', 'Cart updated!');
    } else {
      showNotification('error', data.message || 'Failed to update cart');
    }
  })
  .catch(error => {
    console.error('Update cart error:', error);
    showNotification('error', 'Failed to update cart');
  });
}

// Remove item from cart via AJAX
function removeFromCartAJAX(productId) {
  const csrfToken = document.querySelector('input[name="_csrf"]')?.value;

  fetch(`/cart/${productId}/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({})
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const itemRow = document.querySelector(`[data-product-id="${productId}"]`);
      if (itemRow) {
        itemRow.remove();
      }
      updateCartCount(data.itemCount);
      updateCartSummary();
      showNotification('success', 'Item removed from cart');

      // If cart is now empty, show empty message
      const cartTable = document.querySelector('.cart-table tbody');
      if (cartTable && cartTable.children.length === 0) {
        location.reload(); // Reload to show empty cart message
      }
    } else {
      showNotification('error', data.message || 'Failed to remove item');
    }
  })
  .catch(error => {
    console.error('Remove item error:', error);
    showNotification('error', 'Failed to remove item from cart');
  });
}

// Update cart summary (total price and item count)
function updateCartSummary() {
  fetch('/cart/summary', {
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const totalElement = document.querySelector('.cart-total');
      if (totalElement) {
        totalElement.textContent = '$' + parseFloat(data.total).toFixed(2);
      }
      updateCartCount(data.itemCount);
    }
  })
  .catch(error => console.error('Summary fetch error:', error));
}

// Update cart item count badge
function updateCartCount(count) {
  const cartCountElement = document.getElementById('cart-count');
  if (cartCountElement) {
    cartCountElement.textContent = count || 0;
  }
}

// Clear entire cart
function clearCartAJAX() {
  if (!confirm('Are you sure you want to clear your entire cart?')) {
    return;
  }

  const csrfToken = document.querySelector('input[name="_csrf"]')?.value;

  fetch('/cart/clear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({})
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('success', 'Cart cleared');
      updateCartCount(0);
      location.reload();
    } else {
      showNotification('error', data.message || 'Failed to clear cart');
    }
  })
  .catch(error => {
    console.error('Clear cart error:', error);
    showNotification('error', 'Failed to clear cart');
  });
}

// Show notification toast
function showNotification(type, message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Add to page
  const container = document.querySelector('.toast-container') || document.body;
  container.insertBefore(toast, container.firstChild);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Handle quantity input changes in cart
document.addEventListener('DOMContentLoaded', () => {
  // Cart quantity input handlers
  const quantityInputs = document.querySelectorAll('.cart-quantity');
  quantityInputs.forEach(input => {
    input.addEventListener('change', function() {
      const productId = this.closest('[data-product-id]').dataset.productId;
      const quantity = parseInt(this.value);

      if (isNaN(quantity) || quantity <= 0) {
        this.value = 1;
        showNotification('error', 'Quantity must be at least 1');
        return;
      }

      updateCartItemAJAX(productId, quantity);
    });
  });

  // Add to cart button handlers (on product pages)
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function() {
      const productId = this.dataset.productId;
      const quantityInput = this.closest('form')?.querySelector('input[name="quantity"]') ||
                           document.querySelector(`input[name="quantity"]`);
      const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

      addToCartAJAX(productId, quantity);
    });
  });
});
