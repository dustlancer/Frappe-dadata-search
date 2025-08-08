# Copyright (c) 2025, Andrey Alperin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import os
import requests


class Client(Document):
	pass


@frappe.whitelist()
def get_dadata_token():
    """Возвращает Dadata API ключ из окружения"""
    return {"token": os.environ.get("DADATA_API_KEY")}

@frappe.whitelist()
def get_address_by_inn(inn):
	token = os.environ.get("DADATA_API_KEY")
	if not token: 
		frappe.throw("Dadata API ключ не настроен. Добавьте DADATA_API_KEY в переменные окружения.")
	
	url = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"
	headers = {
		"Content-Type": "application/json",
		"Accept": "application/json",
		"Authorization": f"Token {token}"
	}
	data = {"query": inn}

	try:
		response = requests.post(url, json=data, headers=headers)
		if response.ok:
			suggestions = response.json().get("suggestions", [])
			if suggestions:
				return suggestions[0]
		return {"error": "Организация не найдена"}
	except Exception as e:
		frappe.log_error(f"Dadata findById error: {str(e)}")
		frappe.throw("Ошибка при получении данных от Dadata")


@frappe.whitelist()
def get_party_suggestions(query):
	token = os.environ.get("DADATA_API_KEY")
	if not token:
		frappe.log_error("Dadata API ключ не найден в переменных окружения")
		return {"suggestions": []}
	
	url = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party"
	headers = {
		"Content-Type": "application/json",
		"Accept": "application/json",
		"Authorization": f"Token {token}"
	}
	data = {
		"query": query,
		"count": 10
	}
	
	try:
		response = requests.post(url, json=data, headers=headers)
		if response.ok:
			return response.json()
		else:
			frappe.log_error(f"Dadata API ответил с кодом: {response.status_code}")
			return {"suggestions": []}
	except Exception as e:
		frappe.log_error(f"Dadata suggestions error: {str(e)}")
		return {"suggestions": []}
