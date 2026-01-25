// Mock res.render and res.redirect globally for all integration tests
const express = require('express');


beforeEach(() => {
  jest.spyOn(express.response, 'render').mockImplementation(function(view, options, callback) {
    if (typeof callback === 'function') callback(null, '');
    let content = `<html><body>Mocked Render: ${view}`;
    if (options) {
      if (typeof options === 'object') {
        if (options.errors && Array.isArray(options.errors) && options.errors.length > 0) {
          content += ` | errors: ${options.errors.map(e => e.msg || e).join(', ')}`;
        }
        if (options.product && options.product.name) {
          content += ` | product: ${options.product.name}`;
        }
        if (options.products && Array.isArray(options.products)) {
          content += ` | products: ${options.products.map(p => p.name).join(', ')}`;
        }
        if (options.user && options.user.username) {
          content += ` | user: ${options.user.username}`;
        }
        if (options.message) {
          content += ` | message: ${options.message}`;
        }
      }
    }
    content += `</body></html>`;
    if (options && typeof options.status === 'number') {
      this.status(options.status);
    } else {
      this.status(200);
    }
    // Allow per-test overrides for status, content, and location
    if (global.__mockRenderOverride) {
      if (typeof global.__mockRenderOverride.status === 'number') {
        this.status(global.__mockRenderOverride.status);
      }
      if (typeof global.__mockRenderOverride.location === 'string') {
        this.set('Location', global.__mockRenderOverride.location);
      }
      if (typeof global.__mockRenderOverride.content === 'string') {
        this.send(global.__mockRenderOverride.content);
        return this;
      }
    }
    this.send(content);
    return this;
  });
  jest.spyOn(express.response, 'redirect').mockImplementation(function(url, status) {
    // Allow custom status code for redirects
    if (typeof status === 'number') {
      this.status(status);
    } else {
      this.status(302);
    }
    this.set('Location', url);
    this.send(`Redirected to ${url}`);
    return this;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
