---
layout: page
title: Write-ups
icon: fas fa-file-lines
permalink: /write-ups/
order: 4
---

{% assign posts = site.categories['Write-ups'] %}

<div id="post-list" class="flex-grow-1 px-xl-1">
  {% for post in posts %}
    <article class="card-wrapper card">
      <a href="{{ post.url | relative_url }}" class="post-preview row g-0 flex-md-row-reverse">
        <div class="col-md-12">
          <div class="card-body d-flex flex-column">
            <h1 class="card-title my-2 mt-md-0">{{ post.title }}</h1>

            <div class="card-text content mt-0 mb-3">
              <p>{{ post.description | default: post.excerpt | strip_html | truncate: 150 }}</p>
            </div>

            <div class="post-meta">
              <i class="far fa-calendar fa-fw me-1"></i>
              {{ post.date | date: "%Y-%m-%d" }}
            </div>
          </div>
        </div>
      </a>
    </article>
  {% endfor %}
</div>