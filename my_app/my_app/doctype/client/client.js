frappe.ui.form.on('Client', {
    refresh: function(frm) {
      if (!$('link[href*="dadata-autocomplete.css"]').length) {
        $('<link rel="stylesheet" type="text/css" href="/assets/my_app/css/dadata-autocomplete.css">').appendTo('head');
      }
      
      frm.add_custom_button(__('Получить адрес'), function() {
        if (!frm.doc.inn) {
          frappe.msgprint(__('Укажите ИНН'));
          return;
        }
  
        frappe.call({
          method: "my_app.my_app.doctype.client.client.get_address_by_inn",
          args: {
            inn: frm.doc.inn
          },
          callback: function(r) {

            console.log(r);
            if (r && !r.message.error) {
                
              const data = r.message.data;

              frm.set_value('name1', data.name.short_with_opf);
              frm.set_value('inn', data.inn);
              frm.set_value('kpp', data.kpp);
              frm.set_value('address', data.address.value);
              
              frappe.show_alert({
                message: __('Адрес получен:\n' + data.address.value),
                indicator: 'green'
              });
            } else {
                frappe.show_alert({
                    message: __('Организация не найдена'),
                    indicator: 'red'
            });
            }
          }
        });
      });
      
      setup_dadata_autocomplete(frm);
    },
  });

function setup_dadata_autocomplete(frm) {
  const fields = ['name1', 'inn'];
  
  $('.dadata-suggestions').remove();
  
  fields.forEach(function(fieldname) {
    setup_autocomplete(frm, fieldname);
  });
  
  $(document).off('click.dadata-global').on('click.dadata-global', function(e) {
    if (!$(e.target).closest('.dadata-suggestions, .form-control').length) {
      $('.dadata-suggestions').remove();
    }
  });
}

function setup_autocomplete(frm, fieldname) {
  let field = frm.fields_dict[fieldname];
  if (!field) return;
  
  let input = field.$input;
  if (!input) return;
  
  input.off('input.dadata keydown.dadata blur.dadata');
  $('.dadata-suggestions').remove();
  
  let timeout;
  let currentSuggestionIndex = -1;
  
  input.on('input.dadata', function() {
    let query = $(this).val();
    
    clearTimeout(timeout);
    $('.dadata-suggestions').remove();
    
    if (query && query.length >= 2) {
      timeout = setTimeout(function() {
        get_dadata_suggestions(frm, query, fieldname);
      }, 300);
    } else {
      $('.dadata-suggestions').remove();
    }
  });
  
  input.on('keydown.dadata', function(e) {
    let dropdown = $('.dadata-suggestions');
    if (!dropdown.length) return;
    
    let items = dropdown.find('.dadata-suggestion-item');
    
    switch(e.keyCode) {
      case 40:
        e.preventDefault();
        currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, items.length - 1);
        highlight_suggestion(items, currentSuggestionIndex);
        break;
        
      case 38:
        e.preventDefault();
        currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
        highlight_suggestion(items, currentSuggestionIndex);
        break;
        
      case 13:
        e.preventDefault();
        if (currentSuggestionIndex >= 0) {
          $(items[currentSuggestionIndex]).click();
        }
        break;
        
      case 27:
        dropdown.remove();
        currentSuggestionIndex = -1;
        break;
    }
  });
}


function highlight_suggestion(items, index) {
  items.removeClass('active');
  if (index >= 0 && index < items.length) {
    $(items[index]).addClass('active');
  }
}

function get_dadata_suggestions(frm, query, fieldname) {
  let field = frm.fields_dict[fieldname];
  let input = field.$input;
  
  show_loading_dropdown(input);
  
  frappe.call({
    method: "my_app.my_app.doctype.client.client.get_party_suggestions",
    args: {
      query: query
    },
    callback: function(r) {
      $('.dadata-suggestions').remove();
      
      if (r.message && r.message.suggestions && r.message.suggestions.length > 0) {
        show_suggestions_dropdown(frm, r.message.suggestions, fieldname, query);
      } else {
        show_no_results_dropdown(input);
      }
    },
    error: function() {
      $('.dadata-suggestions').remove();
      show_error_dropdown(input);
    }
  });
}

function show_loading_dropdown(input) {
  $('.dadata-suggestions').remove();
  
  let dropdown = $('<div class="dadata-suggestions"></div>');
  let loadingItem = $('<div class="dadata-loading"><div class="dadata-spinner"></div>Поиск организаций...</div>');
  dropdown.append(loadingItem);
  
  let fieldWrapper = input.closest('.form-group');
  fieldWrapper.css('position', 'relative');
  fieldWrapper.append(dropdown);
  

  setTimeout(function() {
    if (dropdown.find('.dadata-loading').length) {
      dropdown.remove();
    }
  }, 10000);
}


function show_no_results_dropdown(input) {
  $('.dadata-suggestions').remove();
  
  let dropdown = $('<div class="dadata-suggestions"></div>');
  let noResultsItem = $('<div class="dadata-no-results">Организации не найдены</div>');
  dropdown.append(noResultsItem);
  
  let fieldWrapper = input.closest('.form-group');
  fieldWrapper.css('position', 'relative');
  fieldWrapper.append(dropdown);
  
  setTimeout(function() {
    dropdown.fadeOut(300, function() {
      $(this).remove();
    });
  }, 3000);
}

function show_error_dropdown(input) {
  $('.dadata-suggestions').remove(); // Принудительно удаляем предыдущие
  
  let dropdown = $('<div class="dadata-suggestions"></div>');
  let errorItem = $('<div class="dadata-error">Ошибка при получении данных</div>');
  dropdown.append(errorItem);
  
  let fieldWrapper = input.closest('.form-group');
  fieldWrapper.css('position', 'relative');
  fieldWrapper.append(dropdown);
  
  // Автоматически скрываем через 3 секунды
  setTimeout(function() {
    dropdown.fadeOut(300, function() {
      $(this).remove();
    });
  }, 3000);
}

function show_suggestions_dropdown(frm, suggestions, fieldname, query) {
  let field = frm.fields_dict[fieldname];
  let input = field.$input;
  
  $('.dadata-suggestions').remove();
  
  if (!suggestions.length) return;
  let dropdown = $('<div class="dadata-suggestions"></div>');
  
  suggestions.forEach(function(suggestion, index) {
    let item = $('<div class="dadata-suggestion-item"></div>');
    
    // Создаем структурированное отображение
    let mainDiv = $('<div class="dadata-suggestion-main"></div>');
    let detailsDiv = $('<div class="dadata-suggestion-details"></div>');
    
    // Основное название с подсветкой
    let displayName = suggestion.value || '';
    if (query) {
      displayName = highlight_text(displayName, query);
    }
    mainDiv.html(displayName);
    
    // Дополнительные детали
    let details = [];
    if (suggestion.data) {
      if (suggestion.data.inn) {
        details.push(`<span class="dadata-suggestion-inn">ИНН: ${suggestion.data.inn}</span>`);
      }
      if (suggestion.data.kpp) {
        details.push(`КПП: ${suggestion.data.kpp}`);
      }
      if (suggestion.data.address && suggestion.data.address.value) {
        let address = suggestion.data.address.value;
        if (address.length > 60) {
          address = address.substring(0, 60) + '...';
        }
        details.push(`Адрес: ${address}`);
      }
    }
    
    if (details.length > 0) {
      detailsDiv.html(details.join(' • '));
    }
    
    item.append(mainDiv);
    if (details.length > 0) {
      item.append(detailsDiv);
    }
    
    // Сохраняем данные подсказки
    item.data('suggestion', suggestion);
    
    // Обработчик клика по подсказке
    item.on('click', function() {
      select_suggestion(frm, suggestion);
      dropdown.remove();
    });
    
    // Подсветка при наведении и клавиатурной навигации
    item.on('mouseenter', function() {
      $('.dadata-suggestion-item').removeClass('active');
      $(this).addClass('active');
    });
    
    dropdown.append(item);
  });
  
  let fieldWrapper = input.closest('.form-group');
  fieldWrapper.css('position', 'relative');
  fieldWrapper.append(dropdown);
  
  input.on('blur.dadata', function() {
    setTimeout(function() {
      if (!dropdown.is(':hover')) {
        dropdown.remove();
      }
    }, 200);
  });
}

function highlight_text(text, query) {
  if (!query || query.length < 2) return text;
  
  let regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="dadata-highlight">$1</span>');
}

function select_suggestion(frm, suggestion) {
  $('.dadata-suggestions').remove();
  
  if (suggestion.data) {
    const data = suggestion.data;
    
    if (data.name && data.name.short_with_opf) {
      frm.set_value('name1', data.name.short_with_opf);
    }
    
    if (data.inn) {
      frm.set_value('inn', data.inn);
    }
    
    if (data.kpp) {
      frm.set_value('kpp', data.kpp);
    }
    
    if (data.address && data.address.value) {
      frm.set_value('address', data.address.value);
    }
    
    frappe.show_alert({
      message: __('Данные организации заполнены автоматически'),
      indicator: 'green'
    });
  }
}
  